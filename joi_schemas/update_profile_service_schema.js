const Joi = require("joi");

const update_profile_service_schema = Joi.object({
  name: Joi.string().optional(),
  surname: Joi.string().optional(),
  dial_code: Joi.string().optional(),
  phone_number: Joi.string().optional(),
  backup_phones: Joi.array().items(
    Joi.object({
      dial_code: Joi.string().optional(),
      phone_number: Joi.string().required().messages({
        "any.required": "Phone number is required. "
      }),
      name: Joi.string().optional(),
      surname: Joi.string().optional(),
      proximity: Joi.string().optional()
    })
  ).optional()
});

module.exports = update_profile_service_schema;