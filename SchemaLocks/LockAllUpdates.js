function LockAllUpdates(schema) {

  var operations = [
    'update', 'updateOne', 'updateMany',
    'findOneAndUpdate', 'findByIdAndUpdate',
    'replaceOne'
  ];
  operations.forEach(function(row) {
    schema.pre(row, function(next) {
      next(new Error('Updates are disabled for this model'));
    });
  });

  schema.pre('save', function(next) {
    if (!this.isNew) return next(new Error('Updates are disabled for this model (save)'));
    return next();
  });

  schema.statics.bulkWrite = function() {
    throw new Error('bulkWrite is disabled for this model');
  };
}

module.exports = LockAllUpdates;