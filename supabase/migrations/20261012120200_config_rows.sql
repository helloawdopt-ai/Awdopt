-- Starting weights (scope §3) and hard constraints. Both are editable by admin.

insert into public.match_weights (category, weight) values
  ('lifestyle', 25),
  ('living', 20),
  ('time', 15),
  ('household', 10),
  ('experience', 10),
  ('size', 10),
  ('age', 5),
  ('special_needs', 5);

insert into public.hard_constraints (key, description) values
  ('children_under_12', 'Dog is not safe with children and the adopter has children under 12'),
  ('other_pets', 'Dog is not safe with dogs or cats and the adopter has that species at home'),
  ('large_space', 'Dog needs a large space and the adopter''s home cannot provide it'),
  ('special_needs', 'Dog has ongoing medical or special needs and the adopter declined special needs'),
  ('alone_time', 'Dog would be alone longer than its stated tolerance');
