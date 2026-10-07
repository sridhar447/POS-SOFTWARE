/**
 * Central Express Error Handler
 */
export const errorHandler = (err, req, res, next) => {
  console.error('🔥 Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  const statusCode = err.statusCode || err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
};
