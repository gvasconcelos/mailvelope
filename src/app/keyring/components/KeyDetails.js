/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import mvelo from '../../../mvelo';
import * as l10n from '../../../lib/l10n';
import DatePicker from './DatePicker';
import DefinePassword from './DefinePassword';
import KeySelect from './KeySelect';
import KeyStatus from './KeyStatus';
import ModalDialog from '../../../components/util/ModalDialog';

import './KeyDetails.css';

l10n.register([
  'key_details_title',
  'keygrid_primary_key',
  'keygrid_subkeys',
  'keygrid_user_ids',
  'keygrid_export',
  'dialog_popup_close',
  'keygrid_keyid',
  'keygrid_algorithm',
  'keygrid_key_length',
  'keygrid_key_fingerprint',
  'keygrid_validity_status',
  'keygrid_status_valid',
  'keygrid_status_invalid',
  'keygrid_key_not_expire'
]);

// set locale
moment.locale(navigator.language);

export default class KeyDetails extends React.Component {
  constructor(props) {
    super(props);
    const keys = this.getAllKeys(props.keyDetails);
    const defaultKeyIdx = 0;
    const normalizedExDate = this.normalizeDate(keys[defaultKeyIdx].exDate);
    this.state = {
      showExDateModal: false,
      showPwdModal: false,
      keys,
      selectedKeyIdx: defaultKeyIdx,
      exDateInput: normalizedExDate,
      keyExpirationTime: normalizedExDate,
      passwordCurrent: '',
      password: '',
      passwordCheck: '',
      errors: {}
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleChangeKey = this.handleChangeKey.bind(this);
    this.handleChangeExDate = this.handleChangeExDate.bind(this);
    this.handleChangePwd = this.handleChangePwd.bind(this);
    this.validateChangePwd = this.validateChangePwd.bind(this);
    this.cleanUpPwdData = this.cleanUpPwdData.bind(this);
    this.handleHiddenModal = this.handleHiddenModal.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyDetails !== prevProps.keyDetails) {
      this.setState({keys: this.getAllKeys(this.props.keyDetails)});
    }
  }

  normalizeDate(date) {
    return date !== false ? moment(date) : null;
  }

  getAllKeys({status, algorithm, bitLength, crDate, exDate, fingerprint, keyId, subkeys}) {
    return [
      {status, crDate, exDate, keyId, algorithm, bitLength, fingerprint},
      ...subkeys
    ];
  }

  handleChange(event) {
    const target = event.target;
    this.setState(({errors: err}) => {
      const {[target.id]: deleted, ...errors} = err;
      return {
        [target.id]: target.value,
        errors
      };
    });
  }

  handleChangeKey(selectedKeyIdx) {
    this.setState(prevState => {
      const normalizedExDate = this.normalizeDate(prevState.keys[selectedKeyIdx].exDate);
      return {
        selectedKeyIdx,
        exDateInput: normalizedExDate,
        keyExpirationTime: normalizedExDate
      };
    });
  }

  async handleChangeExDate() {
    const isoTimeString = this.state.keyExpirationTime !== null ? this.state.keyExpirationTime.toISOString() : false;
    if (this.state.keys[this.state.selectedKeyIdx].exDate !== isoTimeString) {
      try {
        await this.props.onChangeExpDate(isoTimeString);
        this.setState(prevSate => ({
          exDateInput: prevSate.keyExpirationTime
        }));
      } catch (error) {
        if (error.code !== 'PWD_DIALOG_CANCEL') {
          throw error;
        }
      } finally {
        this.processSetExDate = false;
      }
    }
  }

  async validateChangePwd() {
    const errors = {};

    const pwdIsValid = await this.props.onValidateKeyPwd(this.state.passwordCurrent);
    if (!pwdIsValid) {
      errors.passwordCurrent = new Error();
    }
    if (!this.state.password.length) {
      errors.password = new Error();
    }
    if (this.state.password.length && this.state.password !== this.state.passwordCheck) {
      errors.passwordCheck = new Error();
    }
    if (Object.keys(errors).length) {
      this.setState({errors});
      return;
    }

    this.processChangePwd = true;
    this.modal.$node.modal('hide');
  }

  async handleChangePwd() {
    try {
      await this.props.onChangePwd(this.state.passwordCurrent, this.state.password);
    } catch (error) {
      if (error.code !== 'PWD_DIALOG_CANCEL') {
        throw error;
      }
    } finally {
      this.processChangePwd = false;
    }
  }

  cleanUpPwdData() {
    this.setState({
      showPwdModal: false,
      password: '',
      passwordCheck: '',
      passwordCurrent: '',
      errors: {}
    });
  }

  async handleHiddenModal() {
    if (this.processSetExDate) {
      await this.handleChangeExDate();
    } else if (this.processChangePwd) {
      await this.handleChangePwd();
    }
    this.cleanUpPwdData();
    this.setState(prevSate => ({
      showExDateModal: false,
      keyExpirationTime: prevSate.exDateInput
    }));
  }


  render() {
    const selectedKey = this.state.keys[this.state.selectedKeyIdx];
    return (
      <div className="keyDetails">
        <div className="panel panel-default">
          <div className="panel-heading clearfix">
            <h4 className="pull-left text-muted">Schlüsseldetails</h4>
            <div className="pull-right">
              <KeySelect keys={this.state.keys}  selectedKeyIdx={this.state.selectedKeyIdx} onChange={index => this.handleChangeKey(index)} />
            </div>
          </div>
          <div className="panel-body">
            <div className="row">
              <form className="form-horizontal">
                <div className="col-md-5">
                  <div className="form-group">
                    <label className="col-sm-3 control-label">{l10n.map.keygrid_validity_status}</label>
                    <div className="col-sm-9 text-only">
                      <KeyStatus status={selectedKey.status} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-sm-3 control-label">Erstellt am</label>
                    <div className="col-sm-9 text-only">
                      {moment(selectedKey.crDate).format('L')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-sm-3 control-label">Läuft ab am</label>
                    <div className="col-sm-9">
                      { this.props.keyDetails.type !== 'public' && this.state.selectedKeyIdx === 0
                        ? (
                          <div className="input-group input-group-sm">
                            <input type="text" readOnly className="form-control" value={this.state.exDateInput !== null ? this.state.exDateInput.format('L') : 'nie'} />
                            <span className="input-group-btn">
                              <button onClick={() => this.setState({showExDateModal: true})} className="btn btn-sm btn-default" type="button" disabled={!this.props.keyDetails.validity}>Ändern</button>
                            </span>
                          </div>
                        ) : <div className="text-only">{selectedKey.exDate ? moment(selectedKey.exDate).format('L') : 'nie'}</div>
                      }
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-sm-3 control-label">Password</label>
                    <div className="col-sm-9">
                      { this.props.keyDetails.type !== 'public' && this.state.selectedKeyIdx === 0
                        ? (
                          <div className="input-group input-group-sm">
                            <input type="password" readOnly className="form-control" value="********" />
                            <span className="input-group-btn">
                              <button onClick={() => this.setState({showPwdModal: true})} className="btn btn-default" type="button" disabled={!this.props.keyDetails.validity}>Ändern</button>
                            </span>
                          </div>
                        ) : <div className="text-only">********</div>
                      }
                    </div>
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="form-group">
                    <label className="col-sm-3 control-label">{l10n.map.keygrid_keyid}</label>
                    <div className="col-sm-9 text-only">
                      {selectedKey.keyId}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-sm-3 control-label">{l10n.map.keygrid_algorithm}</label>
                    <div className="col-sm-9 text-only">
                      {selectedKey.algorithm}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-sm-3 control-label">{l10n.map.keygrid_key_length}</label>
                    <div className="col-sm-9 text-only">
                      {selectedKey.bitLength}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="col-sm-3 control-label">{l10n.map.keygrid_key_fingerprint}</label>
                    <div className="col-sm-9 text-only">
                      {mvelo.ui.formatFpr(selectedKey.fingerprint)}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
        {this.state.showExDateModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Ablaufdatum ändern" hideFooter={true} onHide={this.handleHiddenModal}>
            <>
              <div className="form-group">
                <DatePicker value={this.state.keyExpirationTime} onChange={moment => this.handleChange({target: {id: 'keyExpirationTime', value: moment}})} placeholder={l10n.map.keygrid_key_not_expire} minDate={moment().add({days: 1})} maxDate={moment('2080-12-31')} disabled={false} />
              </div>
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">Abbrechen</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={() => this.processSetExDate = true} className="btn btn-primary btn-block" data-dismiss="modal">Speichern</button>
                </div>
              </div>
            </>
          </ModalDialog>
        }
        {this.state.showPwdModal &&
          <ModalDialog ref={modal => this.modal = modal} size="small" headerClass="text-center" title="Passwort ändern" hideFooter={true} onHide={this.handleHiddenModal}>
            <form>
              <div className={`form-group ${this.state.errors.passwordCurrent ? ' has-error' : ''}`}>
                <label className="control-label" htmlFor="passwordCurrent">Altes Password</label>
                <input type="password" onChange={this.handleChange} className="form-control" id="passwordCurrent" />
                <span className={`help-block ${this.state.errors.passwordCurrent ? 'show' : 'hide'}`}>Falsches Passwort!</span>
              </div>
              <DefinePassword value={this.state} errors={this.state.errors} onChange={this.handleChange} disabled={this.state.success} />
              <div className="row gutter-5">
                <div className="col-xs-6">
                  <button type="button" className="btn btn-default btn-block" data-dismiss="modal">Abbrechen</button>
                </div>
                <div className="col-xs-6">
                  <button type="button" onClick={this.validateChangePwd} className="btn btn-primary btn-block">Speichern</button>
                </div>
              </div>
            </form>
          </ModalDialog>
        }
      </div>
    );
  }
}

KeyDetails.propTypes = {
  keyDetails: PropTypes.object.isRequired,
  onChangeExpDate: PropTypes.func,
  onValidateKeyPwd: PropTypes.func,
  onChangePwd: PropTypes.func
};
