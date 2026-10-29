alter table shopping_item_sources add column recipe_id uuid;
alter table shopping_item_sources add column recipe_name varchar(255);
alter table shopping_item_sources add column ingredient_name varchar(255);
alter table shopping_item_sources add column meal_date date;
alter table shopping_item_sources add column meal_type varchar(255);
