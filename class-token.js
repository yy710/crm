const axios = require('axios');
const assert = require('assert');

class Token {
  constructor(config, col) {
    this.saveToken = false;
    this.col = col;
    this.config = config;
    this.tokenName = 'access_token';
    this.token = null;
  }

  findToken() {
    this.token = global.tokens.find(t => t.agentid == this.config.agentid && t.name == this.tokenName);
    return !!this.token;
  }

  // token: { agentid, name, value, expire_in, update_time }
  async find() {
    if (!global.tokens) global.tokens = [];
    if (Array.isArray(global.tokens) && global.tokens.length > 0 && this.findToken()) {
      console.log('find %s from global.tokens', this.tokenName);
    } else {
      (await this.col.find().toArray()).forEach(tk => {
        const index = global.tokens.findIndex(t => t.agentid == tk.agentid && t.name == tk.tokenName);
        if (index >= 0) {
          global.tokens[index] = tk;
        } else {
          global.tokens.push(tk);
        }
      });
      // have bugs?
      // global.tokens = [...global.tokens, ...tokens];

      this.findToken();
      console.log('find %s from db', this.tokenName);
    }
    console.log('global.tokens.length: ', global.tokens.length);
    return this;
  }

  checkout() {
    if (this.token) {
      const diffTime = new Date().getTime() - this.token.update_time;
      if (diffTime >= this.token.value.expires_in * 1000) {
        console.log('token expired!');
        this.token = null;
      }
    }
    return this;
  }

  getUrl() {
    return `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.config.corpid}&corpsecret=${this.config.secret}`;
  }

  async getNewToken() {
    if (this.token) return this;
    const r = (await axios.get(this.getUrl())).data;
    // console.log('axios.get().data: ', r);
    assert.equal(0, r.errcode);
    delete r.errcode;
    delete r.errmsg;
    this.token = { agentid: this.config.agentid, name: this.tokenName, value: r, update_time: new Date().getTime() };
    // update global.tokens
    const index = global.tokens.findIndex(t => t.agentid == this.config.agentid && t.name == this.tokenName);
    if (index >= 0) global.tokens[index] = this.token;

    console.log('get new %s use axios', this.tokenName);
    this.saveToken = true;
    return this;
  }

  async saveToDb() {
    if (this.saveToken && this.token) {
      await this.col.replaceOne({ name: this.tokenName, agentid: this.config.agentid }, this.token, { upsert: 1 });
      this.saveToDb = false;
    }
    return this;
  }

  async _getToken() {
    return (await (await this.find()).checkout().getNewToken()).saveToDb();
  }

  async getToken() {
    await this._getToken();
    return this.token.value.access_token;
  }
}

class AccessToken extends Token {}

class JsapiTicket extends Token {
  constructor(config, col, access_token) {
    super(config, col);
    this.tokenName = 'jsapi_ticket';
    this.access_token = access_token;
  }

  getUrl() {
    return `https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=${this.access_token}`;
  }

  async getToken() {
    await this._getToken();
    return this.token.value.ticket;
  }
}

async function getToken(config, col) {
  const access_token = await new AccessToken(config, col).getToken();
  const jsapi_ticket = await new JsapiTicket(config, col, access_token).getToken();
  return { access_token, jsapi_ticket };
}

module.exports = { getToken };
