const TRUEMONEY_API_BASE = 'https://gift.truemoney.com/campaign/vouchers';

const ERROR_MAP = {
  VOUCHER_OUT_OF_STOCK:  'Voucher หมดแล้ว หรือถูกใช้ไปแล้ว',
  VOUCHER_NOT_FOUND:     'ไม่พบ Voucher นี้',
  VOUCHER_EXPIRED:       'Voucher หมดอายุแล้ว',
  TARGET_USER_NOT_FOUND: 'ไม่พบเบอร์โทรในระบบ TrueMoney',
  INTERNAL_ERROR:        'TrueMoney server error ลองใหม่อีกครั้ง',
};

const PHONE_REGEX = /^(06|08|09)\d{8}$/;

function extractVoucherCode(input) {
  const match = input.match(/[?&]v=([a-zA-Z0-9]+)/);
  return match ? match[1] : input.trim();
}

function isValidPhone(phone) {
  return PHONE_REGEX.test(phone);
}

async function redeemVoucher(phone, voucherCode) {
  const url = `${TRUEMONEY_API_BASE}/${voucherCode}/redeem`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Bot Angpao',
    },
    body: JSON.stringify({ mobile: phone, voucher_hash: voucherCode }),
  });

  const contentType = res.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`TrueMoney returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return { data, httpStatus: res.status };
}

async function redeem(phone, voucher) {
  if (!phone || !voucher) {
    return {
      success: false,
      error: 'Missing required arguments: phone and voucher',
    };
  }

  if (!isValidPhone(phone)) {
    return {
      success: false,
      error: 'Invalid Thai phone number (must start with 06/08/09 and be 10 digits)',
    };
  }

  const code = extractVoucherCode(voucher);

  try {
    const { data } = await redeemVoucher(phone, code);
    const statusCode = data?.status?.code;

    if (statusCode === 'SUCCESS') {
      const v = data?.data?.voucher ?? {};
      return {
        success: true,
        amount:  v.amount_baht ?? v.redeemed_amount_baht ?? '?',
        owner:   v.owner?.full_name ?? 'Unknown',
        raw:     data,
      };
    }

    return {
      success: false,
      code:    statusCode,
      error:   ERROR_MAP[statusCode] ?? data?.status?.message ?? 'Unknown error',
      raw:     data,
    };

  } catch (err) {
    return {
      success: false,
      error:  'Failed to contact TrueMoney API',
      detail:  err.message,
    };
  }
}

const Angpao = {
  redeem,
  extractVoucherCode,
  isValidPhone,
  ERROR_MAP,
};

export default Angpao;
export { redeem, extractVoucherCode, isValidPhone, ERROR_MAP };
