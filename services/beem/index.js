const axios = require('axios');
const https = require('https');

require('dotenv').config();

function getBeemConfig() {
  const enabled = (process.env.BEEM_ENABLED || 'false').toLowerCase() === 'true';
  const smsApi = process.env.BEEM_SMS_API;
  const authToken = process.env.BEEM_AUTH_TOKEN;
  const sourceAddress = process.env.BEEM_SOURCE_ADDRESS;

  return { enabled, smsApi, authToken, sourceAddress };
}

async function sendSMS({ message = '', recipients = [] }) {
  const { enabled, smsApi, authToken, sourceAddress } = getBeemConfig();

  if (!enabled) return { ok: false, skipped: true, reason: 'beem_disabled' };
  if (!smsApi) throw new Error('BEEM_SMS_API_is_required');
  if (!authToken) throw new Error('BEEM_AUTH_TOKEN_is_required');
  if (!sourceAddress) throw new Error('BEEM_SOURCE_ADDRESS_is_required');

  const body = {
    encoding: 0,
    message,
    schedule_time: '',
    recipients,
    source_addr: sourceAddress,
  };

  await axios.post(smsApi, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authToken}`,
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });

  return { ok: true };
}

module.exports = { sendSMS };
