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

export default function DefaultKeyButton(props) {
  return (
    <>
      {props.isDefault
        ? (
          <button type="button" className={`btn btn-warning ${props.className || ''}`} disabled={true} title="Schlüssel ist als Standardschlüssel gesetzt">{l10n.map.keygrid_default_label}</button>
        ) :
        props.disabled
          ? (
            <button type="button" className={`btn btn-default ${props.className || ''}`} disabled={true} title="Schlüssel ist ungültig und kann nicht als Standardschlüssel gesetzt werden">
              {l10n.map.key_set_as_default}
            </button>
          ) : (
            <button type="button" className={`btn btn-default ${props.className || ''}`} onClick={props.onClick} title="Schlüssel als Standardschlüssel setzen">
              {l10n.map.key_set_as_default}
            </button>
          )
      }
    </>
  );
}

DefaultKeyButton.propTypes = {
  className: PropTypes.string,
  isDefault: PropTypes.bool.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool
};
