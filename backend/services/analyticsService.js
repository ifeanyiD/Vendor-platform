const Analytics = require('../models/Analytics');

/**
 * Get today's date string YYYY-MM-DD
 */
const today = () => new Date().toISOString().split('T')[0];

/**
 * Increment store views for a vendor today
 */
const trackStoreView = async (vendorId) => {
  try {
    await Analytics.findOneAndUpdate(
      { vendor: vendorId, date: today() },
      { $inc: { storeViews: 1 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[ANALYTICS] trackStoreView error:', err.message);
  }
};

/**
 * Increment WhatsApp tap for a vendor + specific product today
 */
const trackWhatsAppTap = async (vendorId, productId) => {
  try {
    const update = {
      $inc: {
        whatsappTaps: 1,
        [`productTaps.${productId}`]: 1
      }
    };
    await Analytics.findOneAndUpdate(
      { vendor: vendorId, date: today() },
      update,
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[ANALYTICS] trackWhatsAppTap error:', err.message);
  }
};

/**
 * Get analytics summary for a vendor over N days
 */
const getSummary = async (vendorId, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const records = await Analytics.find({
    vendor: vendorId,
    date: { $gte: sinceStr }
  }).sort({ date: 1 });

  const totals = records.reduce(
    (acc, r) => ({
      storeViews: acc.storeViews + r.storeViews,
      whatsappTaps: acc.whatsappTaps + r.whatsappTaps
    }),
    { storeViews: 0, whatsappTaps: 0 }
  );

  // Daily series for charts
  const daily = records.map(r => ({
    date: r.date,
    storeViews: r.storeViews,
    whatsappTaps: r.whatsappTaps
  }));

  // Top products by tap count
  const productTapMap = {};
  records.forEach(r => {
    if (r.productTaps) {
      r.productTaps.forEach((count, productId) => {
        productTapMap[productId] = (productTapMap[productId] || 0) + count;
      });
    }
  });

  const topProducts = Object.entries(productTapMap)
    .map(([productId, taps]) => ({ productId, taps }))
    .sort((a, b) => b.taps - a.taps)
    .slice(0, 5);

  return { totals, daily, topProducts, days };
};

module.exports = { trackStoreView, trackWhatsAppTap, getSummary };
