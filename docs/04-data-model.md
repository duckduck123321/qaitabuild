# 4. Модель данных (Supabase / PostgreSQL)

Названия таблиц и полей взяты из PRD. Типы, ограничения и enum помечены **[предложение]**.

## Схема связей

```
auth.users 1─1 profiles
profiles   1─* listings ─1─* listing_images
                 │
                 ├─1─0..1 material_passports
                 └─*─* favorites (user_id ↔ listing_id)
profiles   1─* ai_analyses
profiles   1─* project_requests
```

## Таблицы

### profiles
| Поле | Тип [предложение] | Примечание |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| email | text | |
| city | text | |
| phone | text | контакт для связи |
| created_at | timestamptz default now() | |

### listings
| Поле | Тип [предложение] | Примечание |
|---|---|---|
| id | uuid PK | |
| seller_id | uuid FK → profiles.id | |
| title | text not null | |
| description | text | |
| category | text / enum | 10 категорий, см. [02-marketplace.md](02-marketplace.md) |
| price | numeric(12,2) ≥ 0 | в ₸ |
| quantity | numeric > 0 | |
| unit | text | шт, м², м³… |
| condition | text / enum | |
| city | text | |
| status | text / enum | **[предложение]** `draft` · `active` · `sold` · `archived` · `blocked` |
| created_at | timestamptz | |
| updated_at | timestamptz | обновляется триггером |

### listing_images
| Поле | Тип | Примечание |
|---|---|---|
| id | uuid PK | |
| listing_id | uuid FK → listings.id, on delete cascade | |
| image_url | text | путь в Storage |
| created_at | timestamptz | |

### material_passports
| Поле | Тип | Примечание |
|---|---|---|
| id | uuid PK | |
| listing_id | uuid FK → listings.id | |
| material_type | text | |
| visual_condition | text | |
| visible_defects | jsonb / text[] | |
| recovery_recommendations | jsonb | |
| reuse_recommendations | jsonb | |
| ai_analysis | jsonb | сырой ответ ИИ |
| verification_status | text / enum | **[предложение]** `ai_suggested` · `user_confirmed` · `expert_verified` |
| created_at | timestamptz | |

> Чтобы различать «пользователь / ИИ / подтверждено» на уровне отдельных полей, **[предложение]** хранить в `ai_analysis` объект вида `{ field: { value, source: "user"|"ai"|"verified" } }`.

### favorites
| Поле | Тип |
|---|---|
| id | uuid PK |
| user_id | uuid FK → profiles.id |
| listing_id | uuid FK → listings.id |
| created_at | timestamptz |

**[предложение]** unique (user_id, listing_id).

### ai_analyses
| Поле | Тип | Примечание |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | |
| analysis_type | text / enum | `inspector` · `recovery` · `passport` · `reuse_planner` · `pre_demolition` |
| input_data | jsonb | текст / пути к фото |
| result | jsonb | |
| created_at | timestamptz | |

### project_requests
| Поле | Тип |
|---|---|
| id | uuid PK |
| user_id | uuid FK → profiles.id |
| project_description | text |
| extracted_materials | jsonb |
| recommendations | jsonb |
| created_at | timestamptz |

## Row Level Security

Требование PRD: RLS на **всех** таблицах; пользователь меняет только свои данные.

**[предложение]** Политики:

| Таблица | SELECT | INSERT / UPDATE / DELETE |
|---|---|---|
| profiles | все (публичные поля) | только `id = auth.uid()` |
| listings | все, где `status = 'active'`; владелец видит все свои | только `seller_id = auth.uid()` |
| listing_images | как у родительского listing | только владелец listing |
| material_passports | как у родительского listing | только владелец listing |
| favorites | только свои | только свои |
| ai_analyses | только свои | только свои |
| project_requests | только свои | только свои |

Номер телефона в `profiles` не стоит отдавать анонимам **[предложение]**: вынести его в отдельную view или колонку с отдельной политикой.

## Storage

**[предложение]** Bucket `listing-images` (public read, запись только в папку `{auth.uid()}/…`), bucket `ai-uploads` (private, для фото на анализ без объявления).

## Правило изменения схемы

Перед любым изменением структуры БД Claude объясняет, какие таблицы и связи добавятся или изменятся (см. [10-dev-rules.md](10-dev-rules.md)).
