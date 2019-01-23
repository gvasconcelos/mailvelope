/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import {port} from '../../app';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keyring_public',
  'keyring_private',
  'keygrid_all_keys',
  'key_export_create_file',
  'header_warning',
  'key_export_warning_private'
]);

export default class KeyExport extends React.Component {
  constructor(props) {
    super(props);
    const type = props.publicOnly ? 'pub' : props.type;
    this.state = {
      type,
      keys: [],
      fileName: `${props.keyName.replace(/\s/g, '_')}_${type}.asc`
    };
    this.fileURL = '';
    this.handleClickExport = this.handleClickExport.bind(this);
    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
  }

  async componentDidMount() {
    const keys = await port.send('getArmoredKeys', {keyringId: this.props.keyringId, keyFprs: this.props.keyFprs, options: {pub: true, priv: !this.props.publicOnly, all: this.props.all}});
    this.setState({keys});
  }

  handleTypeChange(type) {
    this.setState({type, fileName: `${this.props.keyName.replace(/\s/g, '_')}_${type}.asc`});
  }

  handleClickExport() {
    this.exportLink.click();
  }

  handleCopyToClipboard() {
    this.textarea.select();
    document.execCommand('copy');
  }

  componentWillUnmount() {
    window.URL.revokeObjectURL(this.fileURL);
  }

  render() {
    const type = this.state.type;
    const armoredExport = this.state.keys.reduce((acc, key) => {
      let result = acc;
      if (key.armoredPrivate && (type === 'priv' || type === 'all')) {
        result += `${key.armoredPrivate || ''}\n`;
      }
      if (type === 'pub' || type === 'all') {
        result += key.armoredPublic || '';
      }
      return result;
    }, '');
    // create file
    const file = new File([armoredExport], this.state.fileName, {type: 'application/pgp-keys'});
    this.fileURL = window.URL.createObjectURL(file);
    return (
      <div>
        {
          this.state.keys.some(key => key.armoredPrivate) &&
          <div className="clearfix">
            <p style={{'lineHeight': '32px', 'marginBottom': '15px', 'display': 'inline-block'}}>Welchen Schlüssel möchten Sie exportieren?</p>
            <div className="btn-group pull-right" data-toggle="buttons">
              <label className={`btn btn-${type === 'pub' ? 'primary active' : 'default'}`} onClick={() => this.handleTypeChange('pub')}>
                <input type="radio" name="public" defaultChecked={type === 'pub'} />
                <span>{l10n.map.keyring_public}</span>
              </label>
              <label className={`margin-left-sm btn btn-${type === 'priv' ? 'primary active' : 'default'}`} onClick={() => this.handleTypeChange('priv')}>
                <input type="radio" name="private" defaultChecked={type === 'priv'} />
                <span>{l10n.map.keyring_private}</span>
              </label>
              <label className={`margin-left-sm btn btn-${type === 'all' ? 'primary active' : 'default'}`} onClick={() => this.handleTypeChange('all')}>
                <input type="radio" name="all" defaultChecked={type === 'all'} />
                <span>{l10n.map.keygrid_all_keys}</span>
              </label>
            </div>
          </div>
        }
        {
          type !== 'pub' &&
          <div style={{marginTop: '10px'}} id="exportWarn" className="alert alert-warning">
            <b>{l10n.map.header_warning}</b>&nbsp;
            <span>{l10n.map.key_export_warning_private}</span>
          </div>
        }
        <div className="form-group">
          <textarea ref={node => this.textarea = node} style={{'resize': 'none', 'backgroundColor': '#FFF'}} id="armoredKey" className="form-control" rows="13" value={armoredExport} spellCheck="false" autoComplete="off" readOnly></textarea>
        </div>
        <div className="clearfix">
          <button type="button" className="btn btn-default" onClick={this.props.onClose} data-dismiss="modal">{l10n.map.dialog_popup_close}</button>
          <button type="button" className="pull-right margin-left-sm btn btn-primary" onClick={this.handleClickExport}>{l10n.map.key_export_create_file}</button>
          {type === 'pub' && <button type="button" className="pull-right btn btn-primary" onClick={this.handleCopyToClipboard}>In die Zwischenablage kopieren</button>}
          <a className="hide" download={this.state.fileName} href={this.fileURL} ref={node => this.exportLink = node}></a>
        </div>
      </div>
    );
  }
}

KeyExport.propTypes = {
  keyringId: PropTypes.string,
  keyFprs: PropTypes.array,
  all: PropTypes.bool,
  keyName: PropTypes.string.isRequired,
  type: PropTypes.string,
  publicOnly: PropTypes.bool,
  onClose: PropTypes.func
};

KeyExport.defaultProps = {
  all: false,
  type: 'pub',
  publicOnly: false
};
