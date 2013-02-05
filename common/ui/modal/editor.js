/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012  Thomas Oberndörfer
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {
  // shares ID with EncryptFrame
  var id;
  // id of encrypt frame that triggered this dialog
  var parentID;
  var editor_type;
  var eFrame;
  var port;
  var editor

  function init() {
    var qs = jQuery.parseQuerystring();
    parentID = qs['parent'];
    editor_type = qs['editor_type'];
    $('#cancelBtn').click(onCancel);
    $('#transferBtn').click(onTransfer);
    eFrame = new EncryptFrame({security: {editor_mode: mvelo.EDITOR_WEBMAIL}});
    if (editor_type == mvelo.PLAIN_TEXT) {
      editor = createPlainText();
      eFrame.attachTo($('#plainText'), false, editor);
      editor.focus();
    } else {
      editor = createRichText();
      eFrame.attachTo($('#richText'), false, editor);
    }
    id = 'editor-' + eFrame.getID();
    port = mvelo.extension.connect({name: id});
    port.onMessage.addListener(messageListener);
    port.postMessage({event: 'editor-init', sender: id}); 
  }

  function onCancel() {
    window.close();
    return false;
  }

  function onTransfer() {
    var armored = editor.val();
    port.postMessage({
      event: 'editor-transfer-armored', 
      data: armored,
      sender: id,
      recipient: parentID
    });
    window.close();
    return true;
  }

  function createPlainText() {
    var sandbox = $('#plainText');
    sandbox.show();
    var text = $('<textarea/>', {
      id: 'content',
      css: {
        width: '100%',
        height: '100%',
        'margin-bottom': 0
      }
    });
    var style = $('<link/>', {
      rel: 'stylesheet',
      href: '../../dep/bootstrap/css/bootstrap.min.css'
    });
    var head = sandbox.contents().find('head');
    style.appendTo(head);
    sandbox.contents().find('body').append(text);
    return text;
  }

  function createRichText() {
    $('#richText').show().wysihtml5();
    //var editor = new wysihtml5.Editor("richText");
  }

  function messageListener(msg) {
    //console.log('decrypt dialog messageListener: ', JSON.stringify(msg));
    switch (msg.event) {
      case 'set-text':
        if (editor_type == mvelo.PLAIN_TEXT) {
          editor.val(msg.text);
        }
        break;
      default:
        console.log('unknown event');
    }
  }

  $(document).ready(init);
  
}());