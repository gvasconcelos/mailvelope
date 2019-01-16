/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keygrid_default_label',
  'key_set_as_default',
  'invalid_default_key'
]);

export default class DefaultKeyButton extends React.Component {
  componentDidMount() {
    this.initTooltip();
  }

  componentDidUpdate() {
    this.initTooltip();
  }

  initTooltip() {
    if (this.props.disabled) {
      $(this.defaultButton).tooltip();
    }
  }

  render() {
    return (
      <>
      {this.props.isDefault
        ? (
          <button type="button" className={`btn btn-warning ${this.props.className || ''}`} disabled={true}>{l10n.map.keygrid_default_label}</button>
        ) :
        this.props.disabled
          ? (
            <div ref={node => this.defaultButton = node} style={{display: 'inline-block'}} data-toggle="tooltip" data-placement="top" title={l10n.map.invalid_default_key}>
              <button type="button" className={`btn btn-default disabled ${this.props.className || ''}`}>
                {l10n.map.key_set_as_default}
              </button>
            </div>
          ) : (
            <button type="button" className={`btn btn-default ${this.props.className || ''}`} onClick={this.props.onClick}>
              {l10n.map.key_set_as_default}
            </button>
          )
      }
      </>
    );
  }
}

DefaultKeyButton.propTypes = {
  className: PropTypes.string,
  isDefault: PropTypes.bool.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool
};
