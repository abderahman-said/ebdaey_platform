
-- Add description column to content_bank_blocks
ALTER TABLE public.content_bank_blocks ADD COLUMN IF NOT EXISTS description text;

-- Migrate existing image blocks: embed image into text_content as rich HTML
UPDATE public.content_bank_blocks
SET text_content = COALESCE(text_content, '') || '<p><img src="' || file_url || '" /></p>',
    file_url = NULL,
    content_type = 'rich'
WHERE content_type = 'image' AND file_url IS NOT NULL;

-- Migrate text and note types to rich
UPDATE public.content_bank_blocks
SET content_type = 'rich'
WHERE content_type IN ('text', 'note', 'image');
