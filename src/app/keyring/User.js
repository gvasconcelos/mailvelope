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
      exit: false,
      showDeleteModal: false,
      showRevokeModal: false,
      hasChanged: false,
      modal: null,
      errors: {},
      user: null,
      keyDetails: {
        ...props.keys[props.match.params.keyIdx]
      }
    };
    this.handleDelete = this.handleDelete.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleRevoke = this.handleRevoke.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
  }

  componentDidMount() {
    this.getKeyDetails(this.context);
  }

  async getKeyDetails({keyringId}) {
    let user = {};
    if (this.props.match.params.userIdx !== 'add') {
      const result = await port.send('getKeyDetails', {fingerprint: this.state.keyDetails.fingerprint, keyringId});
      user = {
        signatures: result.users[this.props.match.params.userIdx].signatures,
        name: result.users[this.props.match.params.userIdx].name,
        email: result.users[this.props.match.params.userIdx].email,
        status: result.users[this.props.match.params.userIdx].status,
        crDate: new Date().toISOString(),
        exDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      };
    }
    this.setState(prevState => ({
      loading: false,
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

  handleSave() {
    const validEmail = mvelo.util.checkEmail(this.state.user.email);
    if (!validEmail) {
      this.setState({errors: {email: new Error()}});
      return;
    }
    if (this.props.match.params.userIdx === 'add') {
      console.log('implement add user...');
    } else {
      console.log('implement save user...');
    }
    this.setState({exit: true});
  }

  handleDelete() {
    this.setState({exit: true}, console.log('implement remove user...'));
  }

  handleRevoke() {
    console.log('implement revoke user...');
    this.modal.$node.modal('hide');
  }

  handleHiddenModal() {
    if (this.processDelete) {
      this.handleDelete();
    } else {
      this.setState({showDeleteModal: false});
    }
  }


  render() {
    if (this.state.exit) {
      return <Redirect to={`/keyring/key/${this.props.match.params.keyIdx}`} />;
    }
    return (
      <div className="user">
        <ol className="breadcrumb">
          <li><Link to={`/keyring/key/${this.props.match.params.keyIdx}`} replace tabIndex="0"><span className="glyphicon glyphicon-menu-left" aria-hidden="true"></span> {this.state.keyDetails.name}</Link></li>
        </ol>
        <nav className="navbar">
          <div className="container-fluid">
            <div className="navbar-header">
              <div className="navbar-brand">
                <span>{this.props.match.params.userIdx !== 'add' ? (this.state.keyDetails.type !== 'public' ? 'Benutzer ID bearbeiten' : 'Benutzer ID anzeigen') : 'Benutzer ID erstellen'}</span>
              </div>
            </div>
            { this.state.keyDetails.type !== 'public' &&
            <div className="collapse navbar-collapse">
              <div className="navbar-form navbar-right">
                { this.state.hasChanged || this.props.match.params.userIdx === 'add'
                  ? <button type="button" onClick={this.handleSave} className="btn btn-primary">{this.props.match.params.userIdx === 'add' ? 'Erstellen' : 'Speichern'}</button>
                  : <Link className="btn btn-default" role="button" to={`/keyring/key/${this.props.match.params.keyIdx}`} replace tabIndex="0">Fertig</Link>
                }
                {
                  this.props.match.params.userIdx !== 'add' && (
                    <>
                      <button type="button" onClick={() => this.setState({showDeleteModal: true})} className="btn btn-default margin-left-sm">Entfernen</button>
                      <button type="button" onClick={() => this.setState({showRevokeModal: true})} className="btn btn-default margin-left-sm">Gültigkeit widerrufen</button>
                    </>
                  )
                }
              </div>
            </div>
            }
          </div>
        </nav>
        {this.state.loading ? (
          <Spinner delay={0} />
        ) : (
          <>
            <div className="row margin-bottom-xl">
              <div className="col-sm-6">
                {this.state.keyDetails.type !== 'public' || this.props.match.params.userIdx === 'add'
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
                {this.props.match.params.userIdx !== 'add' && (
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
        {this.state.showDeleteModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Benutzer ID entfernen" hideFooter={true} onHide={this.handleHiddenModal}>
            <div className="text-center">
              <p>Möchtest du diese Benutzer ID aus deinem Schlüssel entfernen?</p>
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
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Gültigkeit widerrufen" hideFooter={true} onHide={() => this.setState({showRevokeModal: false})}>
            <div className="text-center">
              <p>Mit dem Widerruf wird der Schlüssel für diese Benutzer ID permanant unbrauchbar gemacht.</p>
              <p><strong>Möchtest du trotzdem wiederrufen?</strong></p>
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">Nein</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={this.handleRevoke} className="btn btn-primary btn-block">Ja</button>
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
  keys: PropTypes.array,
  match: PropTypes.object
};




