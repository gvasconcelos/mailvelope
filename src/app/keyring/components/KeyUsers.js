/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Redirect, Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import KeyStatus from './KeyStatus';
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
      allowSetPrimaryUser: false
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

  sortUsers(a, b) {
    const n = a.id - b.id;
    if (n != 0) {
      return n;
    }
    return b.isPrimary ? 0 : -1;
  }

  render() {
    if (this.state.selectedUser !== null) {
      return <Redirect to={`/keyring/key/${this.props.keyFpr}/user/${this.state.selectedUser}`} />;
    }
    return (
      <div className="keyUsers">
        <div className="panel panel-default">
          <div className="panel-heading clearfix">
            <h4 className="pull-left text-muted">Zugeordnete Benutzer IDs</h4>
            {(this.props.keyType !== 'public' && this.props.keyValidity) && <Link to={`/keyring/key/${this.props.keyFpr}/user/add`} className="btn btn-sm btn-default pull-right" replace tabIndex="0">Neue hinzufügen</Link>}
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
              { this.props.users.sort(this.sortUsers).map(user =>
                <tr key={user.id} onClick={e => this.showUserDetails(e, user.id)} onKeyPress={e => this.handleKeyPress(e, user.id)} tabIndex="0" aria-haspopup="true">
                  <td className="text-center">
                    {(this.props.keyType === 'private' && this.state.allowSetPrimaryUser)
                      ? (<label>
                        <input type="radio" onChange={e => this.props.onChangePrimaryUser(e.target.value)} name="isPrimaryUser" value={user.id} checked={user.isPrimary} />
                      </label>)
                      : <span className={`${user.isPrimary && 'glyphicon glyphicon-ok'}`} aria-hidden="true"></span>
                    }
                  </td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td className="text-center"><KeyStatus status={user.status} /></td>
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
  keyFpr: PropTypes.string,
  keyValidity: PropTypes.bool,
  onChangePrimaryUser: PropTypes.func
};
