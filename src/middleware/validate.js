/**
 * Request validation middleware using Joi schemas
 * @param {Object} schema - Joi schema object
 * @param {string} property - Request property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Doğrulama hatası',
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

module.exports = validate;

