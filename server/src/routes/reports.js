const express = require('express');
const Report = require('../models/Report');
const Story = require('../models/Story');
const Review = require('../models/Review');
const HttpError = require('../utils/httpError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFields, checkId } = require('../utils/validate');

const router = express.Router();

const TARGET_MODELS = { story: Story, review: Review };

router.use(requireAuth);

// POST /api/reports   body: { targetType: 'story' | 'review', targetId, reason }
router.post('/', requireRole('member'), async (req, res) => {
  requireFields(req.body, ['targetType', 'targetId', 'reason']);
  const { targetType, targetId, reason } = req.body;

  const Model = TARGET_MODELS[targetType];
  if (!Model) throw new HttpError(400, 'You can only report a story or a review');
  checkId(targetId, 'target id');

  const target = await Model.findById(targetId);
  if (!target || target.hidden) throw new HttpError(404, `That ${targetType} does not exist`);
  if (target.author.toString() === req.user._id.toString()) {
    throw new HttpError(400, 'You cannot report your own content');
  }

  const alreadyReported = await Report.findOne({
    reporter: req.user._id,
    targetType,
    targetId,
    status: 'open',
  });
  if (alreadyReported) throw new HttpError(409, 'You already reported this, an admin will look at it soon');

  const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason });
  res.status(201).json({ report });
});

// GET /api/reports?status=open   (admin)
router.get('/', requireRole('admin'), async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

  const reports = await Report.find(filter).sort({ createdAt: -1 }).populate('reporter', 'name email').lean();

  // attach a short preview of the reported content so the admin knows what it is
  for (const report of reports) {
    const Model = TARGET_MODELS[report.targetType];
    const target = await Model.findById(report.targetId).populate('author', 'name').lean();
    if (!target) {
      report.target = null;
    } else if (report.targetType === 'story') {
      report.target = { title: target.title, text: target.text.slice(0, 200), author: target.author, hidden: target.hidden };
    } else {
      report.target = { rating: target.rating, text: target.comment, author: target.author, hidden: target.hidden };
    }
  }
  res.json({ reports });
});

// PATCH /api/reports/:id   body: { action: 'dismiss' | 'hide' }   (admin)
router.patch('/:id', requireRole('admin'), async (req, res) => {
  checkId(req.params.id, 'report id');
  const { action } = req.body;
  if (!['dismiss', 'hide'].includes(action)) {
    throw new HttpError(400, "Action must be 'dismiss' or 'hide'");
  }

  const report = await Report.findById(req.params.id);
  if (!report) throw new HttpError(404, 'Report not found');
  if (report.status !== 'open') throw new HttpError(409, 'This report was already handled');

  const resolved = { resolvedBy: req.user._id, resolvedAt: new Date() };

  if (action === 'dismiss') {
    Object.assign(report, resolved, { status: 'dismissed' });
    await report.save();
    return res.json({ report });
  }

  const Model = TARGET_MODELS[report.targetType];
  await Model.updateOne({ _id: report.targetId }, { hidden: true });
  // once the content is hidden every open report about it is done
  await Report.updateMany(
    { targetType: report.targetType, targetId: report.targetId, status: 'open' },
    { ...resolved, status: 'hidden' }
  );
  res.json({ report: await Report.findById(report._id) });
});

module.exports = router;
