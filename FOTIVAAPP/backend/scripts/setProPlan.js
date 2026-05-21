// Script para rodar UMA VEZ no terminal do backend (node scripts/setProPlan.js)
// Ou cole direto no MongoDB Compass / Atlas console

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'fotiva' });

  const User = require('./models/User');

  // Atualiza TODOS os usuários admin para plano pro ativo
  const result = await User.updateMany(
    { isAdmin: true },
    {
      $set: {
        'subscription.status': 'active',
        'subscription.plan': 'pro',
        'subscription.expiresAt': new Date('2099-12-31'),
      }
    }
  );

  console.log(`✅ ${result.modifiedCount} usuário(s) atualizados para plano PRO`);

  // Também atualiza pelo email específico (substitua pelo seu email)
  const resultEmail = await User.updateOne(
    { email: 'marcosvf557@gmail.com' },
    {
      $set: {
        'subscription.status': 'active',
        'subscription.plan': 'pro',
        'subscription.expiresAt': new Date('2099-12-31'),
      }
    }
  );

  console.log(`✅ Email específico: ${resultEmail.modifiedCount} atualizado(s)`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
