const context = require.context('./src', true, /\.(test|spec)\.(js|ts)$/);
context.keys().forEach(context);
