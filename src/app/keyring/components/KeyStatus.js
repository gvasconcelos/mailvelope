import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keygrid_status_valid',
  'keygrid_status_invalid'
]);

export default function KeyStatus({status, className = ''}) {
  let labelClass;
  let labelText;
  switch (status) {
    case 3:
      labelClass = 'success';
      labelText = l10n.map.keygrid_status_valid;
      break;
    case 2:
      labelClass = 'warning';
      labelText = 'widerrufen';
      break;
    case 1:
      labelClass = 'warning';
      labelText = 'abgelaufen';
      break;
    default:
      labelClass = 'danger';
      labelText = l10n.map.keygrid_status_invalid;
  }
  return (
    <span className={`${className} label label-${labelClass}`}>{labelText}</span>
  );
}

KeyStatus.propTypes = {
  status: PropTypes.number,
  className: PropTypes.string
};
