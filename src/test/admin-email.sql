-- Run via the database read-query tool; every result must be true.
select
  public.admin_email_eligible('maicon.x4@gmail.com', now()) is true as verified_owner_allowed,
  public.admin_email_eligible('maicon.x4@gmail.com', null) is false as unverified_owner_denied,
  public.admin_email_eligible('other@gmail.com', now()) is false as other_account_denied,
  public.admin_email_eligible('maicon.x4@gmail.com.attacker.example', now()) is false as suffix_attack_denied,
  public.admin_email_eligible(null, now()) is false as missing_email_denied,
  public.admin_email_eligible('MAICON.X4@GMAIL.COM', now()) is true as case_normalization_allowed;