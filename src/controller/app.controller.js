/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../lib/lib-mvelo';
import * as sub from './sub.controller';
import {initOpenPGP, decryptFile, encryptFile} from '../modules/pgpModel';
import {getById as keyringById, getAllKeyringAttr, setKeyringAttr, deleteKeyring, getKeyData} from '../modules/keyring';
import {delete as deletePwdCache, get as getKeyPwdFromCache, unlock as unlockKey} from '../modules/pwdCache';
import {initScriptInjection} from '../lib/inject';
import * as prefs from '../modules/prefs';
import * as uiLog from '../modules/uiLog';
import {getVersion} from '../modules/defaults';
import {gpgme} from '../lib/browser.runtime';
import * as mveloKeyServer from '../modules/mveloKeyServer';

const unlockQueue = new mvelo.util.PromiseQueue();

export default class AppController extends sub.SubController {
  constructor(port) {
    super(port);
    if (!port) {
      this.mainType = 'app';
      this.id = mvelo.util.getHash();
    }
    // register event handlers
    this.on('get-prefs', () => prefs.prefs);
    this.on('set-prefs', this.updatePreferences);
    this.on('decryptFile', ({encryptedFile}) => decryptFile(encryptedFile, this.unlockKey));
    this.on('encryptFile', encryptFile);
    this.on('getWatchList', prefs.getWatchList);
    this.on('getKeys', ({keyringId}) => keyringById(keyringId).getKeys());
    this.on('removeKey', this.removeKey);
    this.on('revokeKey', this.revokeKey);
    this.on('get-keyserver-status', this.getKeyServerStatus);
    this.on('set-keyserver-status', this.setKeyServerStatus);
    this.on('remove-user', this.removeUser);
    this.on('revoke-user', this.revokeUser);
    this.on('add-user', this.addUser);
    this.on('set-key-expiry-date', this.setKeyExDate);
    this.on('set-key-password', this.setKeyPwd);
    this.on('validate-key-password', this.validateKeyPassword);
    this.on('getArmoredKeys', this.getArmoredKeys);
    this.on('getKeyDetails', this.getKeyDetails);
    this.on('generateKey', this.generateKey);
    this.on('importKeys', this.importKeys);
    this.on('set-watch-list', this.setWatchList);
    this.on('init-script-injection', initScriptInjection);
    this.on('get-all-keyring-attr', getAllKeyringAttr);
    this.on('set-keyring-attr', ({keyringId, keyringAttr}) => setKeyringAttr(keyringId, keyringAttr));
    this.on('get-active-keyring', sub.getActiveKeyringId);
    this.on('set-active-keyring', ({keyringId}) => sub.setActiveKeyringId(keyringId));
    this.on('delete-keyring', this.deleteKeyring);
    this.on('get-ui-log', ({securityLogLength}) => uiLog.getLatest(securityLogLength));
    this.on('get-version', getVersion);
    this.on('get-all-key-data', () => getKeyData({allUsers: false}));
    this.on('open-tab', ({url}) => mvelo.tabs.create(url));
    this.on('get-app-data-slot', ({slotId}) => sub.getAppDataSlot(slotId));
    this.on('encrypt-text-init', this.initEncryptText);
    this.on('encrypt-text', this.encryptText);
    this.on('decrypt-text-init', this.initDecryptText);
    this.on('decrypt-text', this.decryptText);
    this.on('get-gnupg-status', () => Boolean(gpgme));
    this.on('reload-keystore', ({keyringId}) => keyringById(keyringId).keystore.load());
  }

  async updatePreferences(options) {
    const updateOpenPGPFlag = typeof options.prefs.security !== 'undefined' && options.prefs.security.hide_armored_header !== prefs.prefs.security.hide_armored_header;
    await prefs.update(options.prefs);
    // update content scripts
    sub.getByMainType('mainCS').forEach(mainCScontrl => mainCScontrl.updatePrefs());
    if (updateOpenPGPFlag) {
      initOpenPGP();
    }
  }

  async removeKey({fingerprint, type, keyringId}) {
    const result = await keyringById(keyringId).removeKey(fingerprint, type);
    this.sendKeyUpdate();
    return result;
  }

  async removeUser({fingerprint, userId, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const result = await keyringById(keyringId).removeUser(privateKey, userId);
    this.sendKeyUpdate();
    return result;
  }

  async addUser({fingerprint, user, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_ADD_USER'});
    const result = await keyringById(keyringId).addUser(unlockedKey, user);
    this.sendKeyUpdate();
    deletePwdCache(fingerprint);
    return result;
  }

  async revokeUser({fingerprint, userId, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_REVOKE_USER'});
    console.log(unlockedKey, userId);
    const result = await keyringById(keyringId).revokeUser(unlockedKey, userId);
    this.sendKeyUpdate();
    return result;
  }

  async revokeKey({fingerprint, keyringId}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_REVOKE'});
    const result = await keyringById(keyringId).revokeKey(unlockedKey);
    this.sendKeyUpdate();
    return result;
  }

  async getKeyServerStatus({fingerprint, keyringId}) {
    let status;
    const keyServerStore = new mveloKeyServer.KeyServerMap();
    await keyServerStore.init();
    const stored = keyServerStore.get(fingerprint);
    console.log(stored);
    const isUploaded = typeof await mveloKeyServer.fetch({fingerprint}) !== 'undefined';
    console.log(isUploaded);
    if (typeof stored === 'undefined') {
      // key not in local key server storage
      if (isUploaded && keyringById(keyringId).hasPrivateKey([fingerprint])) {
        // key is already uploaded
        // set key in local key server storage to true
        await keyServerStore.set(fingerprint, true);
        status = {confirmed: true, sync: true};
      } else {
        await keyServerStore.set(fingerprint, false);
        status = {confirmed: true, sync: false};
      }
    } else {
      // key has sync state in local storage
      if (stored && isUploaded) {
        // key has true flag in local key server storage (sync request has been sent) && key is on key server
        status = {confirmed: true, sync: true};
      }
      if (stored && !isUploaded) {
        // key has true flag (sync request) && not on keyServer
        status = {confirmed: false, sync: true};
      }
      if (!stored && isUploaded) {
        // key has false flag (desync request) && is on keyServer
        status = {confirmed: false, sync: false};
      }
      if (!stored && !isUploaded) {
        // key has false flag (desync request) && is not keyServer
        status = {confirmed: true, sync: false};
      }
    }
    console.log(status);
    return status;
  }

  async setKeyServerStatus({fingerprint, keyringId, sync}) {
    const key = keyringById(keyringId).keystore.getKeysForId(fingerprint)[0];
    let result;
    if (sync) {
      const publicKeyArmored = key.toPublic().armor();
      result = await mveloKeyServer.upload({publicKeyArmored});
    } else {
      // keyId does not work
      // const keyId = key.getKeyId().toHex().toUpperCase();
      // result = await mveloKeyServer.remove({keyId: `0x${keyId}`});
      const {user: {userId: {email}}} = await key.getPrimaryUser();
      result = await mveloKeyServer.remove({email});
    }
    const keyServerStore = new mveloKeyServer.KeyServerMap();
    await keyServerStore.init();
    await keyServerStore.set(fingerprint, sync);
    return result;
  }

  async setKeyExDate({fingerprint, keyringId, newExDateISOString}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await this.unlockKey({key: privateKey, reason: 'PWD_DIALOG_REASON_SET_EXDATE'});
    const newExDate = newExDateISOString !== false ? new Date(newExDateISOString) : false;
    const result = await keyringById(keyringId).setKeyExDate(unlockedKey, newExDate);
    this.sendKeyUpdate();
    deletePwdCache(fingerprint);
    return result;
  }

  async setKeyPwd({fingerprint, keyringId, currentPassword, password}) {
    const privateKey = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
    const unlockedKey = await unlockKey({key: privateKey, password: currentPassword});
    const result = await keyringById(keyringId).setKeyPwd(unlockedKey, password);
    this.sendKeyUpdate();
    deletePwdCache(fingerprint);
    return result;
  }

  async validateKeyPassword({fingerprint, keyringId, password}) {
    const cached = getKeyPwdFromCache(fingerprint);
    if (typeof cached !== 'undefined' && typeof cached.password !== 'undefined') {
      return password === cached.password;
    } else {
      const key = keyringById(keyringId).getPrivateKeyByFpr(fingerprint);
      try {
        await unlockKey({key, password});
        return true;
      } catch (e) {
        return false;
      }
    }
  }

  getArmoredKeys({keyFprs, options, keyringId}) {
    return keyringById(keyringId).getArmoredKeys(keyFprs, options);
  }

  getKeyDetails({fingerprint, keyringId}) {
    return keyringById(keyringId).getKeyDetails(fingerprint);
  }

  async generateKey({parameters, keyringId}) {
    const result = await keyringById(keyringId).generateKey(parameters);
    this.sendKeyUpdate();
    return result;
  }

  async importKeys({keys, keyringId}) {
    const result = await keyringById(keyringId).importKeys(keys);
    this.sendKeyUpdate();
    return result;
  }

  sendKeyUpdate() {
    sub.getByMainType('editor').forEach(editorCntrl => editorCntrl.sendKeyUpdate());
  }

  async setWatchList({data}) {
    await prefs.setWatchList(data);
    initScriptInjection();
  }

  async deleteKeyring({keyringId}) {
    if (keyringId === mvelo.MAIN_KEYRING_ID) {
      throw new Error('Cannot delete main keyring');
    }
    await deleteKeyring(keyringId);
    sub.setActiveKeyringId(mvelo.MAIN_KEYRING_ID);
  }

  initEncryptText() {
    this.encryptTextCtrl = sub.factory.get('editor');
    return this.encryptTextCtrl.id;
  }

  encryptText() {
    return this.encryptTextCtrl.encryptText();
  }

  initDecryptText() {
    this.decryptTextCtrl = sub.factory.get('decryptCont');
    return this.decryptTextCtrl.id;
  }

  decryptText({armored}) {
    this.decryptTextCtrl.decrypt(armored, mvelo.MAIN_KEYRING_ID);
  }

  async unlockKey({key, reason = ''}) {
    const privKey = await unlockQueue.push(sub.factory.get('pwdDialog'), 'unlockKey', [{key, reason}]);
    return privKey.key;
  }
}
