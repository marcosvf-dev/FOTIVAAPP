const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireActive } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  let settings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
  if (!settings) settings = await prisma.userSettings.create({ data: { userId: req.user.id } });
  res.json(settings);
});

router.patch('/', async (req, res) => {
  const { hourlyRate, editingRate, kmRate, monthlyEvents, defaultMargin } = req.body;
  const settings = await prisma.userSettings.upsert({
    where:  { userId: req.user.id },
    update: {
      ...(hourlyRate    !== undefined && { hourlyRate:    parseFloat(hourlyRate) }),
      ...(editingRate   !== undefined && { editingRate:   parseFloat(editingRate) }),
      ...(kmRate        !== undefined && { kmRate:        parseFloat(kmRate) }),
      ...(monthlyEvents !== undefined && { monthlyEvents: parseInt(monthlyEvents) }),
      ...(defaultMargin !== undefined && { defaultMargin: parseFloat(defaultMargin) }),
    },
    create: { userId: req.user.id },
  });
  res.json(settings);
});

// PATCH /api/settings/profile
router.patch('/profile', async (req, res) => {
  const { name, studioName, phone, whatsappPhone, profileImage, studioLogo } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name          && { name }),
      ...(studioName    !== undefined && { studioName }),
      ...(phone         !== undefined && { phone }),
      ...(whatsappPhone !== undefined && { whatsappPhone }),
      ...(profileImage  !== undefined && { profileImage }),
      ...(studioLogo    !== undefined && { studioLogo }),
    },
    select: { id: true, name: true, email: true, studioName: true, phone: true, profileImage: true, studioLogo: true }
  });
  res.json(updated);
});

module.exports = router;
