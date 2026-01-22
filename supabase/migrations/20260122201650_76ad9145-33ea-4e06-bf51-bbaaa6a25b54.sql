-- Add 'review_output' to workflow_request_type enum
ALTER TYPE workflow_request_type ADD VALUE IF NOT EXISTS 'review_output';