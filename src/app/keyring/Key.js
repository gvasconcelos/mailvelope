/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Redirect, Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import moment from 'moment';
import * as l10n from '../../lib/l10n';
import {port} from '../app';

import {KeyringOptions} from './KeyringOptions';
import KeyUsers from './components/KeyUsers';
import KeyDetails from './components/KeyDetails';
import KeyExport from './components/KeyExport';
import DefaultKeyButton from './components/DefaultKeyButton';
import KeyStatus from './components/KeyStatus';
import Spinner from '../../components/util/Spinner';
import Alert from '../../components/util/Alert';
import ModalDialog from '../../components/util/ModalDialog';

import './Key.css';

l10n.register([
  'keyring_header',
  'action_menu_back',
  'keyring_generate_key',
  'key_gen_generate',
  'form_clear',
  'key_gen_another',
  'key_gen_upload',
  'learn_more_link',
  'alert_header_success',
  'key_gen_success',
  'keygrid_status_valid',
  'keygrid_status_invalid'
]);

// set locale
moment.locale(navigator.language);

export default class Key extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      processing: false,
      showDeleteModal: false,
      showExportModal: false,
      showRevokeModal: false,
      exit: false,
      modal: null,
      keyDetails: {
        ...props.keyData,
        users: [],
        subkeys: []
      },
      isDefault: props.defaultKeyFpr === props.keyData.fingerprint
    };
    this.handleDelete = this.handleDelete.bind(this);
    this.handleDefaultClick = this.handleDefaultClick.bind(this);
    this.handleRevoke = this.handleRevoke.bind(this);
    this.handleSetExDate = this.handleSetExDate.bind(this);
    this.handleChangePwd = this.handleChangePwd.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
    this.validateKeyPassword = this.validateKeyPassword.bind(this);
    this.getKeyServerStatus = this.getKeyServerStatus.bind(this);
    this.handleKeyServerSync = this.handleKeyServerSync.bind(this);
    this.getKeyServerSyncAlert = this.getKeyServerSyncAlert.bind(this);
  }

  componentDidMount() {
    this.getKeyDetails(this.context);
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyData !== prevProps.keyData) {
      this.getKeyDetails(this.context);
    }
  }

  async getKeyDetails({keyringId, demail}) {
    const keyDetails = await port.send('getKeyDetails', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
    const keyServerStatus = await port.send('get-keyserver-status', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
    console.log(keyServerStatus);
    this.setState({
      loading: false,
      keyDetails: {
        keyServerState: demail ? false : keyServerStatus,
        ...this.props.keyData,
        ...keyDetails
      }
    });
  }

  async getKeyServerStatus() {
    /*
    synchronisiert (Wieder entfernen) -> sync = true && confirmed = true ||
    synchroniesirung gestartet, warten auf Bestätigung (Erneut senden) -> sync = true && confirmed = false ||
    synchronisierung gestoppt, warten auf Bestätigungs-Email (Erneut senden) -> sync = false && confirmed = false ||
    nicht synchronisiert (Synchronisieren) -> sync = false && confirmed = true
    */
    return {
      sync: Math.random() >= 0.5,
      confirmed: Math.random() >= 0.5
    };
  }

  handleDefaultClick() {
    this.props.onChangeDefaultKey(this.state.keyDetails.fingerprint);
    this.setState({isDefault: true});
  }

  handleDelete() {
    this.setState({exit: true}, this.props.onDeleteKey(this.state.keyDetails.fingerprint, this.state.keyDetails.type));
  }


  async validateKeyPassword(password) {
    return port.send('validate-key-password', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, password});
  }

  async handleRevoke() {
    this.setState({processing: true});
    try {
      await port.send('revokeKey', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId});
      this.props.onKeyringChange();
    } catch (error) {
      if (error.code !== 'PWD_DIALOG_CANCEL') {
        throw error;
      }
    } finally {
      this.processRevoke = false;
      this.setState({
        processing: false,
        showRevokeModal: false
      });
    }
  }

  handleSetPrimaryUser(userIdx) {
    console.log('implement set primary user id:', userIdx);
  }

  async handleKeyServerSync(sync) {
    try {
      const result = await port.send('set-keyserver-status', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, sync});
      console.log(result);
      this.props.onKeyringChange();
    } catch (error) {
      throw error;
    }
  }

  async handleSetExDate(newExDateISOString) {
    this.setState({processing: true});
    try {
      await port.send('set-key-expiry-date', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, newExDateISOString});
      this.props.onKeyringChange();
    } catch (error) {
      throw error;
    } finally {
      this.setState({processing: false});
    }
  }

  async handleChangePwd(currentPassword, password) {
    this.setState({processing: true});
    try {
      await port.send('set-key-password', {fingerprint: this.state.keyDetails.fingerprint, keyringId: this.context.keyringId, currentPassword, password});
      this.props.onKeyringChange();
    } catch (error) {
      throw error;
    } finally {
      this.setState({processing: false});
    }
  }

  async handleHiddenModal() {
    if (this.processDelete) {
      this.handleDelete();
    } else if (this.processRevoke) {
      await this.handleRevoke();
    } else {
      this.setState({
        showDeleteModal: false,
        showRevokeModal: false,
      });
    }
  }

  getKeyServerSyncAlert() {
    let data;
    if (this.state.keyDetails.keyServerState.sync) {
      if (this.state.keyDetails.keyServerState.confirmed) {
        data = {
          type: 'success',
          text: 'Der Schlüssel ist mit dem Mailvelope Server synchronisiert.',
          sync: false,
          btnText: 'Wieder entfernen'
        };
      } else {
        data = {
          type: 'warning',
          text: `Zur Synchronisation des Schüssels mit dem Mailvelope Server wurde eine Bestätigungs-Email an ${this.state.keyDetails.email} versandt.`,
          sync: true,
          btnText: 'Erneut senden'
        };
      }
    } else {
      if (this.state.keyDetails.keyServerState.confirmed) {
        data = {
          type: 'danger',
          text: 'Der Schlüssel ist nicht mit dem Mailvelope Server synchronisiert.',
          sync: true,
          btnText: 'Synchronisieren'
        };
      } else {
        data = {
          type: 'warning',
          text: 'Zur endgültigen Entfernung Ihres Schlüssels vom Mailvelope Server wurde eine Bestätigungs Email versandt.',
          sync: false,
          btnText: 'Erneu senden'
        };
      }
    }
    return (
      <Alert type={data.type}>
        {data.text} <button type="button" onClick={() => this.handleKeyServerSync(data.sync)} className="margin-left-md btn btn-sm btn-default">{data.btnText}</button>
      </Alert>
    );
  }

  render() {
    if (this.state.exit) {
      return <Redirect to="/keyring" />;
    }
    return (
      <div className="key">
        <ol className="breadcrumb">
          <li><Link to='/keyring' onClick={this.props.onKeyringChange} replace tabIndex="0"><span className="glyphicon glyphicon-menu-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
        </ol>
        <nav className="navbar">
          <div className="container-fluid">
            <div className="navbar-header">
              <div className="navbar-brand">
                <i className={`icon icon-${this.state.keyDetails.type === 'public' ? 'key' : 'keyPair'}`}></i>
                <span className="margin-left-sm">{this.state.keyDetails.name}</span>
                <KeyStatus className="margin-left-sm" status={this.state.keyDetails.status} />
              </div>
            </div>
            <div className="collapse navbar-collapse">
              <div className="navbar-form navbar-right">
                <button type="button" onClick={() => this.setState({showDeleteModal: true})} className="btn btn-default" title="Schlüssel aus Schlüsselbund entfernen">Entfernen</button>
                <button type="button" onClick={() => this.setState({showExportModal: true})} className="btn btn-default margin-left-sm" title="Schlüssel exportieren">Exportieren</button>
                {this.state.keyDetails.type !== 'public' && <button type="button" onClick={() => this.setState({showRevokeModal: true})} className="btn btn-default margin-left-sm" disabled={!this.state.keyDetails.validity} title="Schlüssel für ungültig erklären">Gültigkeit widerrufen</button>}
                { (!this.context.gnupg && this.state.keyDetails.type !== 'public') && <DefaultKeyButton className="margin-left-sm" onClick={this.handleDefaultClick} isDefault={this.state.isDefault} disabled={!this.state.keyDetails.validDefaultKey} />}
              </div>
            </div>
          </div>
        </nav>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
        <>
          <KeyUsers keyFpr={this.props.match.params.keyFpr} keyType={this.state.keyDetails.type} keyValidity={this.state.keyDetails.validity} users={this.state.keyDetails.users} onChangePrimaryUser={userIdx => this.handleSetPrimaryUser(userIdx)} />
          {this.state.keyDetails.keyServerState &&
            this.getKeyServerSyncAlert()
          }
          <KeyDetails keyDetails={this.state.keyDetails} onChangeExpDate={this.handleSetExDate} onValidateKeyPwd={this.validateKeyPassword} onChangePwd={this.handleChangePwd}></KeyDetails>
        </>
        )}
        {this.state.showDeleteModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Benutzer-ID entfernen" hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>{l10n.map.keygrid_delete_confirmation}</p>
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">Nein</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={() => this.processDelete = true} className="btn btn-primary btn-block" data-dismiss="modal">Ja</button>
                </div>
              </div>
            </div>
          </ModalDialog>
        }
        {this.state.processing &&
          <Spinner fullscreen={true} delay={0} />
        }
        {this.state.showExportModal &&
          <ModalDialog ref={modal => this.modal = modal} size="medium" headerClass="text-center" title="Schlüssel exportieren" hideFooter={true} onHide={() => this.setState({showExportModal: false})}>
            <KeyExport keyringId={this.context.keyringId} keyFprs={[this.state.keyDetails.fingerprint]} keyName={this.state.keyDetails.name} publicOnly={this.context.gnupg} onClose={() => this.modal.$node.modal('hide')} />
          </ModalDialog>
        }
        {this.state.showRevokeModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Gültigkeit widerrufen" hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>Mit dem Widerruf wird der Schlüssel permanant unbrauchbar gemacht.</p>
              <p><strong>Möchten Sie trotzdem wiederrufen?</strong></p>
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">Nein</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={() => this.processRevoke = true} className="btn btn-primary btn-block" data-dismiss="modal">Ja</button>
                </div>
              </div>
            </div>
          </ModalDialog>
        }
      </div>
    );
  }
}

Key.contextType = KeyringOptions;

Key.propTypes = {
  keyData: PropTypes.object,
  getKeyDetails: PropTypes.func,
  defaultKeyFpr: PropTypes.string,
  onChangeDefaultKey: PropTypes.func,
  onKeyringChange: PropTypes.func,
  onDeleteKey: PropTypes.func,
  match: PropTypes.object
};




