const express = require('express');

module.exports = (Contact, authenticateToken) => {
  const router = express.Router();

  // Get all contacts
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const contacts = await Contact.findAll({ order: [['name', 'ASC']] });
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ message: 'Gagal mengambil kontak' });
    }
  });

  // Add contact
  router.post('/', authenticateToken, async (req, res) => {
    const { name, number } = req.body;
    if (!name || !number) return res.status(400).json({ message: 'Nama dan nomor wajib diisi' });
    try {
      const exist = await Contact.findOne({ where: { number } });
      if (exist) return res.status(400).json({ message: 'Nomor sudah terdaftar' });
      const contact = await Contact.create({ name, number });
      res.json({ status: 'success', contact });
    } catch (err) {
      res.status(500).json({ message: 'Gagal menambah kontak' });
    }
  });

  // Update contact
  router.put('/:id', authenticateToken, async (req, res) => {
    const { name, number } = req.body;
    try {
      const contact = await Contact.findByPk(req.params.id);
      if (!contact) return res.status(404).json({ message: 'Kontak tidak ditemukan' });
      contact.name = name;
      contact.number = number;
      await contact.save();
      res.json({ status: 'success', contact });
    } catch (err) {
      res.status(500).json({ message: 'Gagal mengupdate kontak' });
    }
  });

  // Delete contact
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const contact = await Contact.findByPk(req.params.id);
      if (!contact) return res.status(404).json({ message: 'Kontak tidak ditemukan' });
      await contact.destroy();
      res.json({ status: 'success' });
    } catch (err) {
      res.status(500).json({ message: 'Gagal menghapus kontak' });
    }
  });

  return router;
};
