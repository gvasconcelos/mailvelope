/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Redirect, Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import {KeyringOptions} from './../KeyringOptions';

import './KeyUsers.css';

l10n.register([
  'form_import',
  'keygrid_all_keys',
  'keygrid_creation_date_short',
  'keygrid_default_label',
  'keygrid_delete_confirmation',
  'keygrid_import_title',
  'keygrid_export',
  'keygrid_export_title',
  'key_gen_generate',
  'keygrid_generate_title',
  'keygrid_keyid',
  'keygrid_public_keys',
  'keyring_public_private',
  'keygrid_refresh',
  'keygrid_refresh_title',
  'keygrid_sort_type',
  'keygrid_user_name',
  'keygrid_user_email',
  'keygrid_userid_signatures',
  'keygrid_status_valid',
  'keygrid_status_invalid'
]);

export default class KeyUsers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedUser: null,
      validity: true
    };
  }

  handleKeyPress(e, index) {
    if (e.key === 'Enter') {
      this.showUserDetails(e, index);
    }
  }

  showUserDetails(e, index) {
    if (e.target.nodeName !== 'INPUT') {
      this.setState({selectedUser: index});
    }
  }

  render() {
    if (this.state.selectedUser !== null) {
      return <Redirect to={`/keyring/key/${this.props.keyIndex}/user/${this.state.selectedUser}`} />;
    }
    return (
      <div className="keyUsers">
        <div className="panel panel-default">
          <div className="panel-heading clearfix">
            <h4 className="pull-left text-muted">Zugeordnete Benutzer IDs</h4>
            {this.props.keyType !== 'public' && <Link to={`/keyring/key/${this.props.keyIndex}/user/add`} className="btn btn-sm btn-default pull-right" replace tabIndex="0">Neue hinzufügen</Link>}
          </div>
          <table className="table table-hover">
            <thead>
              <tr>
                <th className="text-center">Primär</th>
                <th>{l10n.map.keygrid_user_name}</th>
                <th>{l10n.map.keygrid_user_email}</th>
                <th className="text-center">{l10n.map.keygrid_validity_status}</th>
                <th className="text-center">{l10n.map.keygrid_userid_signatures}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              { this.props.users.map((user, index) =>
                <tr key={index} onClick={e => this.showUserDetails(e, index)} onKeyPress={e => this.handleKeyPress(e, index)} tabIndex="0" aria-haspopup="true">
                  <td className="text-center">
                    {this.props.keyType === 'private'
                      ? (<label>
                        <input type="radio" onChange={e => this.props.onChangePrimaryUser(e.target.value)} name="isPrimaryUser" value={index} checked={index === 0} />
                      </label>)
                      : <span className={`${index === 0 && 'glyphicon glyphicon-ok'}`} aria-hidden="true"></span>
                    }
                  </td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td className="text-center"><span className={`margin-left-sm label label-${this.state.validity ? 'success' : 'danger'}`}>{this.state.validity ? l10n.map.keygrid_status_valid : l10n.map.keygrid_status_invalid}</span></td>
                  <td className="text-center">{user.signatures.length}</td>
                  <td><span className="glyphicon glyphicon-menu-right" aria-hidden="true"></span></td>
                </tr>
              )
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

KeyUsers.contextType = KeyringOptions;

KeyUsers.propTypes = {
  users: PropTypes.array,
  keyType: PropTypes.string,
  keyIndex: PropTypes.string,
  onChangePrimaryUser: PropTypes.func
};
