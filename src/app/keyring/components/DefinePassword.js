/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'key_gen_pwd',
  'key_gen_pwd_empty',
  'key_gen_pwd_reenter',
  'key_gen_pwd_unequal',
  'key_gen_pwd_match'
]);

export default class DefinePassword extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      validPasswordCheck: true
    },
    this.handleChange = this.handleChange.bind(this);
    this.validatePasswordCheck = this.validatePasswordCheck.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    const validPasswordCheck = this.validatePasswordCheck() && (this.props.value.passwordCheck.length || prevProps.value.passwordCheck === '');
    if (validPasswordCheck !== prevState.validPasswordCheck) {
      this.setState({validPasswordCheck});
    }
  }

  validatePasswordCheck() {
    return !this.props.value.passwordCheck.length || !this.props.value.password.length || this.props.value.password === this.props.value.passwordCheck;
  }

  handleChange(event) {
    this.props.onChange(event);
    console.log(this.props.value.password.length, this.props.value.password, this.props.value.passwordCheck);
    console.log(this.validatePasswordCheck());
    this.setState({validPasswordCheck: this.validatePasswordCheck()});
  }

  render() {
    return (
      <div>
        <div className={`form-group ${this.props.errors.password ? ' has-error' : ''}`}>
          <label className="control-label" htmlFor="password">{l10n.map.key_gen_pwd}</label>
          <input value={this.props.value.password} onChange={this.props.onChange} type="password" className="form-control" id="password" disabled={this.props.disabled} />
          <span className={`help-block ${this.props.errors.password ? 'show' : 'hide'}`}>{l10n.map.key_gen_pwd_empty}</span>
        </div>
        <div className={`form-group ${(this.props.errors.passwordCheck || !this.state.validPasswordCheck) ? ' has-error' : ''}`}>
          <label className="control-label" htmlFor="passwordCheck">{l10n.map.key_gen_pwd_reenter}</label>
          <input value={this.props.value.passwordCheck} onChange={this.props.onChange} type="password" className="form-control" id="passwordCheck" disabled={this.props.disabled} />
          <span className={`help-block ${(this.props.errors.passwordCheck  || !this.state.validPasswordCheck) ? 'show' : 'hide'}`}>{l10n.map.key_gen_pwd_unequal}</span>
        </div>
      </div>
    );
  }
}

DefinePassword.propTypes = {
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  errors: PropTypes.object
};
