/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Redirect, Link} from 'react-router-dom';
import moment from 'moment';
import mvelo from '../../mvelo';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import {KeyringOptions} from './KeyringOptions';
import NameAddrInput from './components/NameAddrInput';
import UserSignatures from './components/UserSignatures';
import KeyStatus from './components/KeyStatus';
import Spinner from '../../components/util/Spinner';
import ModalDialog from '../../components/util/ModalDialog';

import './User.css';

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

export default class User extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      processing: false,
      showDetails: false,
      exit: false,
      showDeleteModal: false,
      showRevokeModal: false,
      hasChanged: false,
      modal: null,
      errors: {},
      userEmails: [],
      user: {
        name: '',
        email: ''
      },
      keyDetails: {
        ...props.keyData
      }
    };
    this.handleDelete = this.handleDelete.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleRevoke = this.handleRevoke.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
  }

  componentDidMount() {
    this.getKeyDetails(this.context);
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyData !== prevProps.keyData) {
      this.getKeyDetails(this.context);
    }
  }

  async getKeyDetails({keyringId}) {
    let user = {};
    let allowToRemove = false;
    let allowToRevoke = false;
    const result = await port.send('getKeyDetails', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
    if (this.props.match.params.userIdx !== 'add') {
      const {signatures, userId, name, email, status} = result.users.find(user => user.id == this.props.match.params.userIdx);
      allowToRemove = ((result.users.filter(user => user.status === 3).length > 1) || status < 3) && this.state.keyDetails.status === 3,
      allowToRevoke = (result.users.filter(user => user.status === 3).length > 1) && status === 3,
      user = {
        signatures,
        userId,
        name,
        email,
        status,
        crDate: new Date().toISOString(),
        exDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      };
    }
    this.setState(prevState => ({
      allowToRemove,
      allowToRevoke,
      loading: false,
      userEmails: result.users.map(user => user.email),
      user,
      keyDetails: {
        ...prevState.keyDetails,
      },
    }));
  }

  handleChange(event) {
    const target = event.target;
    this.setState(({errors: err, user}) => {
      const {[target.id]: deleted, ...errors} = err;
      return {
        hasChanged: true,
        user: {
          ...user,
          [target.id]: target.value
        },
        errors
      };
    });
  }

  async handleAdd() {
    const errors = {};
    const validEmail = mvelo.util.checkEmail(this.state.user.email);
    if (!validEmail) {
      errors.email = {invalid: new Error()};
    } else {
      if (this.state.userEmails.includes(this.state.user.email)) {
        errors.email = {exists: new Error()};
      }
    }
    if (Object.keys(errors).length) {
      this.setState({errors});
      return;
    }
    this.setState({processing: true});
    try {
      await port.send('add-user', {fingerprint: this.state.keyDetails.fingerprint, user: this.state.user, keyringId: this.context.keyringId});
      this.setState({exit: true}, () => this.props.onKeyringChange());
    } catch (error) {
      if (error.code !== 'PWD_DIALOG_CANCEL') {
        throw error;
      }
      this.setState({processing: false});
    }
  }

  async handleDelete() {
    this.setState({processing: true});
    try {
      await port.send('remove-user', {fingerprint: this.state.keyDetails.fingerprint, userId: this.state.user.userId, keyringId: this.context.keyringId});
      this.setState({exit: true}, () => this.props.onKeyringChange());
    } catch (e) {
      this.processDelete = false;
      this.setState({
        processing: false,
        showDeleteModal: false
      });
      throw e;
    }
  }

  async handleRevoke() {
    this.setState({processing: true});
    try {
      await port.send('revoke-user', {fingerprint: this.state.keyDetails.fingerprint, userId: this.state.user.userId, keyringId: this.context.keyringId});
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

  handleHiddenModal() {
    if (this.processDelete) {
      this.handleDelete();
    } else if (this.processRevoke) {
      this.handleRevoke();
    } else {
      this.setState({
        showDeleteModal: false,
        showRevokeModal: false
      });
    }
  }


  render() {
    if (this.state.exit) {
      return <Redirect to={`/keyring/key/${this.props.match.params.keyFpr}`} />;
    }
    return (
      <div className="user">
        <ol className="breadcrumb">
          <li><Link to={`/keyring/key/${this.props.match.params.keyFpr}`} replace tabIndex="0"><span className="glyphicon glyphicon-menu-left" aria-hidden="true"></span> {this.state.keyDetails.name}</Link></li>
        </ol>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
          <>
            <nav className="navbar">
              <div className="container-fluid">
                <div className="navbar-header">
                  <div className="navbar-brand">
                    {this.props.match.params.userIdx !== 'add' ?
                      (
                        <>
                          <span>Benutzer-ID</span>
                          <KeyStatus className="margin-left-sm" status={this.state.user.status} />
                        </>
                      ) : (
                        <span>Benutzer erstellen</span>
                      )
                    }
                  </div>
                </div>
                { this.state.keyDetails.type !== 'public' &&
                <div className="collapse navbar-collapse">
                  <div className="navbar-form navbar-right">
                    {this.props.match.params.userIdx === 'add' && <button type="button" onClick={this.handleAdd} className="btn btn-primary">Erstellen</button>}
                    {this.props.match.params.userIdx !== 'add' &&
                      (
                        <>
                          <button type="button" onClick={() => this.setState({showDeleteModal: true})} className="btn btn-default margin-left-sm" disabled={!this.state.allowToRemove} title="Benutzer-ID entfernen">Entfernen</button>
                          <button type="button" onClick={() => this.setState({showRevokeModal: true})} className="btn btn-default margin-left-sm" disabled={!this.state.allowToRevoke} title="Benutzer-ID für ungültig erklären">Gültigkeit widerrufen</button>
                        </>
                      )
                    }
                  </div>
                </div>
                }
              </div>
            </nav>
            <div className="row margin-bottom-xl">
              <div className="col-sm-6">
                {this.props.match.params.userIdx === 'add'
                  ? (
                    <form>
                      <NameAddrInput name={this.state.user.name || ''} email={this.state.user.email || ''} onChange={this.handleChange} errors={this.state.errors} />
                    </form>
                  ) : (
                    <div className="form-horizontal margin-top-md">
                      <div className="form-group">
                        <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keygrid_user_name}</label>
                        <div className="col-sm-8 col-lg-9 text-only">
                          {this.state.user.name}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keygrid_user_email}</label>
                        <div className="col-sm-8 col-lg-9 text-only">
                          {this.state.user.email}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              <div className="col-sm-6 col-md-5 col-md-offset-1">
                {(this.props.match.params.userIdx !== 'add' && this.state.showDetails) && (
                  <div className="form-horizontal margin-top-md">
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">{l10n.map.keygrid_validity_status}</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        <KeyStatus status={this.state.user.status} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">Erstellt am</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        {moment(this.state.user.crDate).format('L')}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="col-sm-4 col-lg-3 control-label">Läuft ab am</label>
                      <div className="col-sm-8 col-lg-9 text-only">
                        {this.state.user.exDate ? moment(this.state.user.exDate).format('L') : 'nie'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {this.state.user.signatures && <UserSignatures signatures={this.state.user.signatures} />}
          </>
        )}
        {this.state.processing &&
          <Spinner fullscreen={true} delay={0} />
        }
        {this.state.showDeleteModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Benutzer-ID entfernen" hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>Möchten Sie diese Benutzer-ID aus Ihrem Schlüssel entfernen?</p>
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
        {this.state.showRevokeModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Gültigkeit widerrufen" hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>Mit dem Widerruf wird der Schlüssel für diese Benutzer-ID permanant unbrauchbar gemacht.</p>
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

User.contextType = KeyringOptions;

User.propTypes = {
  onKeyringChange: PropTypes.func,
  keyData: PropTypes.object,
  match: PropTypes.object,
};




