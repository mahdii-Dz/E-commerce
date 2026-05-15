// controllers/debugWrapper.js
export const withErrorHandler = (controllerFn, controllerName) => {
  return async (req, res) => {
    try {
      console.log(`🔵 [${controllerName}] Started`);
      console.log(`   Method: ${req.method}`);
      console.log(`   URL: ${req.originalUrl}`);
      console.log(`   Body:`, req.body);
      console.log(`   Params:`, req.params);
      console.log(`   Query:`, req.query);
      
      const result = await controllerFn(req, res);
      
      console.log(`🟢 [${controllerName}] Completed successfully`);
      return result;
    } catch (error) {
      console.error(`🔴 [${controllerName}] Failed:`);
      console.error(`   Error:`, error.message);
      console.error(`   Stack:`, error.stack);
      
      // Make sure we haven't already sent headers
      if (!res.headersSent) {
        return res.status(500).json({
          error: `Error in ${controllerName}`,
          message: error.message,
          details: error.toString()
        });
      }
    }
  };
};