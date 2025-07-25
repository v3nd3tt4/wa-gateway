const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AutoReply = sequelize.define('auto_replies', {
    keyword: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    reply: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  });
  return AutoReply;
};
