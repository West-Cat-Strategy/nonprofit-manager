export const WEBHOOK_ENDPOINT_COLUMNS = `
  id,
  user_id,
  url,
  description,
  secret,
  events,
  is_active,
  last_delivery_at,
  last_delivery_status,
  created_at,
  updated_at
`;

export const WEBHOOK_ENDPOINT_SELECT_COLUMNS = `
  we.id,
  we.user_id,
  we.url,
  we.description,
  we.events,
  we.is_active,
  we.last_delivery_at,
  we.last_delivery_status,
  we.created_at,
  we.updated_at
`;

export const WEBHOOK_DELIVERY_COLUMNS = `
  id,
  webhook_endpoint_id,
  event_type,
  payload,
  response_status,
  response_body,
  status,
  attempts,
  next_retry_at,
  processing_started_at,
  delivered_at,
  created_at
`;

export const WEBHOOK_DELIVERY_SELECT_COLUMNS = `
  claimed.id,
  claimed.webhook_endpoint_id,
  claimed.event_type,
  claimed.payload,
  claimed.response_status,
  claimed.response_body,
  claimed.status,
  claimed.attempts,
  claimed.next_retry_at,
  claimed.processing_started_at,
  claimed.delivered_at,
  claimed.created_at
`;
