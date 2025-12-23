/**
 * IPC Channel Names
 * Central registry of all IPC communication channels
 */

export const IPC_CHANNELS = {
  // App lifecycle
  'app:ready': 'app:ready',
  'app:quit': 'app:quit',
  'app:minimize': 'app:minimize',
  'app:maximize': 'app:maximize',
  'app:openPath': 'app:openPath',

  // Templates
  'templates:list': 'templates:list',
  'templates:get': 'templates:get',
  'templates:create': 'templates:create',
  'templates:update': 'templates:update',
  'templates:delete': 'templates:delete',
  'templates:instantiate': 'templates:instantiate',
  'templates:preview': 'templates:preview',
  'templates:createFromTrend': 'templates:createFromTrend',

  // Builds
  'builds:create': 'builds:create',
  'builds:cancel': 'builds:cancel',
  'builds:queue': 'builds:queue',
  'builds:history': 'builds:history',
  'builds:logs': 'builds:logs',
  'builds:progress': 'builds:progress',

  // Trends
  'trends:scan': 'trends:scan',
  'trends:list': 'trends:list',
  'trends:get': 'trends:get',
  'trends:archive': 'trends:archive',
  'trends:delete': 'trends:delete',
  'trends:scanProgress': 'trends:scanProgress',
  'trends:scanComplete': 'trends:scanComplete',

  // Distribution
  'distribution:configureChannel': 'distribution:configureChannel',
  'distribution:publish': 'distribution:publish',
  'distribution:unpublish': 'distribution:unpublish',
  'distribution:getSales': 'distribution:getSales',
  'distribution:getChannelStatus': 'distribution:getChannelStatus',
  'distribution:publications': 'distribution:publications',

  // Database
  'db:query': 'db:query',
  'db:execute': 'db:execute',
  'db:init': 'db:init',
} as const;

export type IPCChannel = keyof typeof IPC_CHANNELS;
