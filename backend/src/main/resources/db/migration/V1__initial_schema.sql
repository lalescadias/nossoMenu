create table families (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 name varchar(255) not null, adults integer not null check(adults between 1 and 20), children integer not null check(children between 0 and 20),
 child_equivalent numeric(38,2) not null check(child_equivalent > 0 and child_equivalent <= 2), max_minutes integer not null,
 repeat_dinner boolean not null, cuisines varchar(255) not null
);
create table accounts (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 name varchar(255) not null, email varchar(255) not null unique, password_hash varchar(255) not null,
 family_id uuid not null references families(id), role varchar(255) not null check(role in ('OWNER','MEMBER'))
);
create index accounts_family on accounts(family_id);
create table invitations (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid not null references families(id), email varchar(255) not null, token_hash varchar(255) not null unique,
 expires_at timestamp with time zone not null, used boolean not null
);
create table recipes (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid references families(id), name varchar(255) not null, description varchar(255), category varchar(255) not null,
 cuisine varchar(255) not null, prep_minutes integer not null check(prep_minutes >= 0), cook_minutes integer not null check(cook_minutes >= 0),
 servings numeric(38,2) not null check(servings>0), side_dish boolean not null, instructions varchar(10000) not null
);
create index recipes_family on recipes(family_id);
create table recipe_ingredients (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 recipe_id uuid references recipes(id), name varchar(255) not null, category varchar(255) not null, quantity numeric(38,8) not null check(quantity>0), unit varchar(255) not null
);
create index ingredients_recipe on recipe_ingredients(recipe_id);
create table favorite_recipes (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid not null references families(id), recipe_id uuid not null references recipes(id), unique(family_id,recipe_id)
);
create table menus (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid not null references families(id), week_start date not null, unique(family_id,week_start)
);
create table meals (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 menu_id uuid references menus(id), meal_date date not null, type varchar(255) not null check(type in ('LUNCH','DINNER')),
 recipe_id uuid not null references recipes(id), servings numeric(38,2) not null check(servings>0), unique(menu_id,meal_date,type)
);
create table shopping_lists (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid not null references families(id), menu_id uuid references menus(id), name varchar(255) not null,
 start_date date, end_date date, status varchar(255) not null check(status in ('ACTIVE','COMPLETED','ARCHIVED'))
);
create index shopping_lists_family on shopping_lists(family_id);
create table shopping_items (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 list_id uuid references shopping_lists(id), name varchar(255) not null, category varchar(255) not null,
 quantity numeric(38,8) not null check(quantity>0), unit varchar(255) not null, source_type varchar(255) not null,
 purchased boolean not null, purchased_by uuid references accounts(id), purchased_at timestamp with time zone, position integer not null
);
create index shopping_items_list on shopping_items(list_id);
create table shopping_item_sources (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 item_id uuid references shopping_items(id), meal_id uuid not null, ingredient_id uuid not null,
 quantity numeric(38,8) not null check(quantity>0), unit varchar(255) not null
);
-- Source IDs deliberately remain historical references if a meal or ingredient is later removed.
create table favorite_products (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid not null references families(id), name varchar(255) not null, category varchar(255) not null, quantity numeric(38,8) not null check(quantity>0), unit varchar(255) not null
);
create table activity (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid not null references families(id), user_id uuid not null references accounts(id), user_name varchar(255) not null,
 action varchar(255) not null, entity_id uuid not null, summary varchar(255) not null
);
create index activity_family_date on activity(family_id,created_at);
