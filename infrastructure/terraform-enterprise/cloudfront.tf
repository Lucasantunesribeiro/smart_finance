resource "aws_cloudfront_cache_policy" "api" {
  count    = var.enable_cloudfront ? 1 : 0
  provider = aws.us_east_1

  name        = "${local.name_prefix}-api-cache-disabled"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

resource "aws_cloudfront_origin_request_policy" "api" {
  count    = var.enable_cloudfront ? 1 : 0
  provider = aws.us_east_1

  name = "${local.name_prefix}-api-origin-all"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "allViewer"
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_cloudfront_distribution" "app" {
  count    = var.enable_cloudfront ? 1 : 0
  provider = aws.us_east_1

  enabled = true
  comment = "${local.name_prefix} distribution"

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "alb-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = var.cloudfront_cache_policy_id
    origin_request_policy_id = var.cloudfront_origin_request_policy_id
    response_headers_policy_id = var.cloudfront_response_headers_policy_id
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.api[0].id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api[0].id
    response_headers_policy_id = var.cloudfront_response_headers_policy_id
  }

  ordered_cache_behavior {
    path_pattern           = "/financehub*"
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.api[0].id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api[0].id
    response_headers_policy_id = var.cloudfront_response_headers_policy_id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  web_acl_id = aws_wafv2_web_acl.cloudfront[0].arn
}
