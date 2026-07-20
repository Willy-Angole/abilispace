-- Migration 004: Add GDA-standard disability types to the enum
-- New values: physical, intellectual, psychosocial, albinism,
--             speech, autism_spectrum, maxillofacial, progressive_chronic
-- Existing values (visual, hearing, mobility, cognitive, multiple, other,
-- prefer_not_to_say) are kept for backwards compatibility.

ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'physical';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'intellectual';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'psychosocial';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'albinism';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'speech';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'autism_spectrum';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'maxillofacial';
ALTER TYPE disability_type ADD VALUE IF NOT EXISTS 'progressive_chronic';
