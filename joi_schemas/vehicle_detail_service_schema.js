const Joi = require("joi");

const vehicle_detail_service_schema = Joi.object({
  qr_code_token: Joi.string().optional(),
  public_code: Joi.string().optional(),
  vehicle_id: Joi.string().optional()
})
.xor('qr_code_token', 'public_code', 'vehicle_id')
.messages({
  'object.missing': 'Either qr_code_token, vehicle_id or public_code is required.',
  'object.xor': 'Provide only one of qr_code_token, vehicle_id or public_code.'
});

module.exports = vehicle_detail_service_schema;