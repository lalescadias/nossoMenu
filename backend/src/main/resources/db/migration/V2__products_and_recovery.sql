alter table accounts add column password_revision bigint not null default 0;
create table products (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 family_id uuid references families(id), canonical_name varchar(255) not null, normalized_name varchar(255) not null,
 category varchar(255) not null, default_unit varchar(255) not null, unique(family_id,normalized_name)
);
create index products_normalized on products(normalized_name);
alter table recipe_ingredients add column product_id uuid references products(id);
alter table shopping_items add column product_id uuid references products(id);
alter table favorite_products add column product_id uuid references products(id);
create table password_resets (
 id uuid primary key, version bigint not null, created_at timestamp with time zone not null, updated_at timestamp with time zone not null,
 account_id uuid not null references accounts(id), token_hash varchar(255) not null unique, expires_at timestamp with time zone not null, used boolean not null
);
create table categories (name varchar(255) primary key, kind varchar(20) not null);
insert into categories(name,kind) values ('Frutas','SHOPPING'),('Legumes e verduras','SHOPPING'),('Carnes','BOTH'),('Peixe','BOTH'),('Laticínios','SHOPPING'),('Mercearia','SHOPPING'),('Congelados','SHOPPING'),('Padaria','SHOPPING'),('Bebidas','SHOPPING'),('Higiene','SHOPPING'),('Limpeza','SHOPPING'),('Outros','SHOPPING'),('Frango','RECIPE'),('Massas','RECIPE'),('Arroz e feijão','RECIPE'),('Legumes','RECIPE'),('Sopas','RECIPE'),('Refeições rápidas','RECIPE'),('Acompanhamentos','RECIPE');
create table units (name varchar(255) primary key, dimension varchar(40) not null, base_factor numeric(18,6) not null);
insert into units(name,dimension,base_factor) values ('g','MASS',1),('kg','MASS',1000),('ml','VOLUME',1),('l','VOLUME',1000),('un','COUNT',1),('colher sopa','TABLESPOON',1),('colher chá','TEASPOON',1),('q.b.','TASTE',1);
alter table recipes add constraint recipe_category_fk foreign key(category) references categories(name);
alter table recipe_ingredients add constraint ingredient_category_fk foreign key(category) references categories(name);
alter table recipe_ingredients add constraint ingredient_unit_fk foreign key(unit) references units(name);
alter table shopping_items add constraint item_category_fk foreign key(category) references categories(name);
alter table shopping_items add constraint item_unit_fk foreign key(unit) references units(name);
alter table products add constraint product_category_fk foreign key(category) references categories(name);
alter table products add constraint product_unit_fk foreign key(default_unit) references units(name);
alter table favorite_products add constraint favorite_category_fk foreign key(category) references categories(name);
alter table favorite_products add constraint favorite_unit_fk foreign key(unit) references units(name);
