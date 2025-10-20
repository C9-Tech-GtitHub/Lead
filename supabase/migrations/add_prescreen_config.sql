-- Add prescreen_config column to runs table to store prescreening preferences
ALTER TABLE runs ADD COLUMN IF NOT EXISTS prescreen_config jsonb DEFAULT '{
  "skipFranchises": true,
  "skipNationalBrands": true,
  "businessSizes": ["small", "medium"],
  "customPrompt": null
}'::jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN runs.prescreen_config IS 'Prescreening configuration: skipFranchises (bool), skipNationalBrands (bool), businessSizes (array), customPrompt (string)';
