-- Admin (M4). Admin pages run on the admin's own session, so RLS (admin role + aal2) decides.

-- Adopter view: the admin ranks an adopter's dogs with the same function the results pages use.
-- SECURITY INVOKER, so a non-admin or aal1 session sees no adopters or dogs and gets zero rows.
-- results_for_token and the write functions stay service_role only.
grant execute on function public.score_dogs_for_adopter(uuid) to authenticated;

-- Weights are saved as one upsert of all 8 rows, so the statement-level "at least one weight above
-- zero" trigger checks only the final set (row-by-row updates could trip it halfway). The admin_all
-- policy already covers insert; the category primary key means no new rows can appear.
grant insert on public.match_weights to authenticated;
