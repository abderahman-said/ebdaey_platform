
-- Create a security definer function to update digital products via RPC (avoids PATCH CORS issues)
CREATE OR REPLACE FUNCTION public.update_digital_product(
  _id UUID,
  _title TEXT DEFAULT NULL,
  _slug TEXT DEFAULT NULL,
  _description TEXT DEFAULT NULL,
  _adjectives TEXT DEFAULT NULL,
  _target_audience TEXT DEFAULT NULL,
  _price NUMERIC DEFAULT NULL,
  _price_before_discount NUMERIC DEFAULT NULL,
  _thumbnail_url TEXT DEFAULT NULL,
  _banner_video_url TEXT DEFAULT NULL,
  _banner_type TEXT DEFAULT NULL,
  _is_published BOOLEAN DEFAULT NULL,
  _is_unlisted BOOLEAN DEFAULT NULL,
  _display_order INTEGER DEFAULT NULL,
  _buy_button_text TEXT DEFAULT NULL,
  _card_button_text TEXT DEFAULT NULL,
  _gift_courses_enabled BOOLEAN DEFAULT NULL,
  _landing_header TEXT DEFAULT NULL,
  _landing_subheader TEXT DEFAULT NULL,
  _landing_header_color TEXT DEFAULT NULL,
  _landing_subheader_color TEXT DEFAULT NULL,
  _landing_header_size TEXT DEFAULT NULL,
  _landing_subheader_size TEXT DEFAULT NULL,
  _landing_features JSONB DEFAULT NULL,
  _faqs JSONB DEFAULT NULL,
  _has_individual_support BOOLEAN DEFAULT NULL,
  _has_community BOOLEAN DEFAULT NULL,
  _community_link TEXT DEFAULT NULL,
  _has_lifetime_updates BOOLEAN DEFAULT NULL,
  _guarantee_enabled BOOLEAN DEFAULT NULL,
  _guarantee_days INTEGER DEFAULT NULL,
  _guarantee_title TEXT DEFAULT NULL,
  _guarantee_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id UUID;
BEGIN
  -- Get tenant_id for the product
  SELECT tenant_id INTO _tenant_id FROM public.digital_products WHERE id = _id;
  
  -- Check permissions (admin or mentor owns the product)
  IF NOT (public.has_role(auth.uid(), 'admin') OR _tenant_id = public.get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.digital_products SET
    title = COALESCE(_title, title),
    slug = COALESCE(_slug, slug),
    description = COALESCE(_description, description),
    adjectives = COALESCE(_adjectives, adjectives),
    target_audience = COALESCE(_target_audience, target_audience),
    price = COALESCE(_price, price),
    price_before_discount = COALESCE(_price_before_discount, price_before_discount),
    thumbnail_url = COALESCE(_thumbnail_url, thumbnail_url),
    banner_video_url = COALESCE(_banner_video_url, banner_video_url),
    banner_type = COALESCE(_banner_type, banner_type),
    is_published = COALESCE(_is_published, is_published),
    is_unlisted = COALESCE(_is_unlisted, is_unlisted),
    display_order = COALESCE(_display_order, display_order),
    buy_button_text = COALESCE(_buy_button_text, buy_button_text),
    card_button_text = COALESCE(_card_button_text, card_button_text),
    gift_courses_enabled = COALESCE(_gift_courses_enabled, gift_courses_enabled),
    landing_header = COALESCE(_landing_header, landing_header),
    landing_subheader = COALESCE(_landing_subheader, landing_subheader),
    landing_header_color = COALESCE(_landing_header_color, landing_header_color),
    landing_subheader_color = COALESCE(_landing_subheader_color, landing_subheader_color),
    landing_header_size = COALESCE(_landing_header_size, landing_header_size),
    landing_subheader_size = COALESCE(_landing_subheader_size, landing_subheader_size),
    landing_features = COALESCE(_landing_features, landing_features),
    faqs = COALESCE(_faqs, faqs),
    has_individual_support = COALESCE(_has_individual_support, has_individual_support),
    has_community = COALESCE(_has_community, has_community),
    community_link = COALESCE(_community_link, community_link),
    has_lifetime_updates = COALESCE(_has_lifetime_updates, has_lifetime_updates),
    guarantee_enabled = COALESCE(_guarantee_enabled, guarantee_enabled),
    guarantee_days = COALESCE(_guarantee_days, guarantee_days),
    guarantee_title = COALESCE(_guarantee_title, guarantee_title),
    guarantee_description = COALESCE(_guarantee_description, guarantee_description),
    updated_at = NOW()
  WHERE id = _id;
END;
$$;

-- Also create a function for toggling publish state
CREATE OR REPLACE FUNCTION public.toggle_digital_product_publish(
  _id UUID,
  _is_published BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id UUID;
BEGIN
  SELECT tenant_id INTO _tenant_id FROM public.digital_products WHERE id = _id;
  IF NOT (public.has_role(auth.uid(), 'admin') OR _tenant_id = public.get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.digital_products SET is_published = _is_published, updated_at = NOW() WHERE id = _id;
END;
$$;

-- Also create a function for updating digital product file title
CREATE OR REPLACE FUNCTION public.update_digital_product_file_title(
  _id UUID,
  _title TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- RLS on digital_product_files will handle permissions
  UPDATE public.digital_product_files SET title = _title WHERE id = _id;
END;
$$;

-- Also create a function for updating digital product display order
CREATE OR REPLACE FUNCTION public.update_digital_product_order(
  _id UUID,
  _display_order INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tenant_id UUID;
BEGIN
  SELECT tenant_id INTO _tenant_id FROM public.digital_products WHERE id = _id;
  IF NOT (public.has_role(auth.uid(), 'admin') OR _tenant_id = public.get_user_tenant_id(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.digital_products SET display_order = _display_order, updated_at = NOW() WHERE id = _id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_digital_product TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_digital_product_publish TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_digital_product_file_title TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_digital_product_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_digital_product TO anon;
GRANT EXECUTE ON FUNCTION public.toggle_digital_product_publish TO anon;
GRANT EXECUTE ON FUNCTION public.update_digital_product_file_title TO anon;
GRANT EXECUTE ON FUNCTION public.update_digital_product_order TO anon;
