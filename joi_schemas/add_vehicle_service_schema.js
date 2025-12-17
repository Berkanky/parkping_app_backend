const Joi = require("joi");

const add_vehicle_service_schema = Joi.object({
  make: Joi.string().required().messages({
    "any.required": "Make is required. "
  }),
  model: Joi.string().required().messages({
    "any.required": "Model is required. "
  }),
  color: Joi.string().required().messages({
    "any.required": "Color is required. "
  }),
  vehicle_type: Joi.string().required().messages({
    "any.required": "Vehicle type is required. "
  }),
  plate: Joi.string().required().messages({
    "any.required": "Plate is required. "
  }),
  qr_code_delete: Joi.string().optional(),
  qr_code_update: Joi.string().optional(),
  vehicle_pictures: Joi.array().optional()
})
.custom((value, helpers) => {
  if (value.qr_code_delete === true && value.qr_code_update === true) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'Please choose only one QR code action: delete or update.'
});

module.exports = add_vehicle_service_schema;