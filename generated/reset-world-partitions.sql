-- Generated from Funcom world-template.yaml
-- Review before applying.
begin;
delete from dune.farm_state;
update dune.world_partition set server_id = null;
delete from dune.world_partition;

insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (1, null, 'Survival_1', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (2, null, 'Overmap', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (3, null, 'SH_Arrakeen', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (4, null, 'SH_HarkoVillage', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (5, null, 'CB_Story_Hephaestus', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (6, null, 'CB_Story_Ecolab_Carthag', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (7, null, 'CB_Story_WaterFatManor', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (8, null, 'DeepDesert_1', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (9, null, 'Story_ProcesVerbal', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (10, null, 'DLC_Story_LostHarvest_EcolabA', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (11, null, 'DLC_Story_LostHarvest_EcolabB', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (12, null, 'DLC_Story_LostHarvest_ForgottenLab', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (13, null, 'Story_ArtOfKanly', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (14, null, 'CB_Dungeon_Hephaestus', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (15, null, 'CB_Dungeon_OldCarthag', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (16, null, 'Story_Faction_Outpost_Atre', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (17, null, 'Story_Faction_Outpost_Hark', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (18, null, 'Story_HeighlinerDungeon', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (19, null, 'CB_Ecolab_Bronze_Green_089', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (20, null, 'CB_Ecolab_Bronze_Green_152', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (21, null, 'CB_Ecolab_Bronze_Green_024', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (22, null, 'CB_Ecolab_Bronze_Green_195', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (23, null, 'CB_Ecolab_Bronze_Green_136', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (24, null, 'CB_Overland_M_01', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (25, null, 'CB_Overland_S_04', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (26, null, 'CB_Overland_S_06', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (27, null, 'CB_Story_BanditFortress01', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (28, null, 'CB_Overland_S_07', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (29, null, 'CB_Overland_S_08', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);
insert into dune.world_partition (partition_id, server_id, map, partition_definition, dimension_index, blocked, label) values (30, null, 'CB_Dungeon_ThePit', '{"type":"box2d_array","box":{"min_x":0,"min_y":0,"max_x":1,"max_y":1}}'::jsonb, 0, false, null);

select setval('dune.world_partition_partition_id_seq', (select max(partition_id) from dune.world_partition));
select dune.update_partition_labels(true);
commit;
