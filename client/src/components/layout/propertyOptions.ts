/** Shared display options and source-informed tooltips for the properties panel. */

export const BLOCK_STYLES = [0, 1, 2, 3, 4, 5, 6];

export const IND_SIDES_OPTIONS = [
  { value: 1, label: 'All faces same tile' },
  { value: 3, label: 'Grouped faces: front/back · top/bottom · sides' },
  { value: 6, label: 'Each face independent' },
];

export const LIGHT_PRESETS = ['#ffffff', '#60b8ff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#f97316'];

export const SLAB_OPTIONS = [
  { value: 0, label: 'Full block' },
  { value: 1, label: '3/4 slab' },
  { value: 2, label: '1/2 slab' },
  { value: 3, label: '1/4 slab' },
];

export const EFFECT_ARMOR_TYPES = ['Heat', 'Kinetic', 'EM'];

export const RESOURCE_TYPE_OPTIONS = [
  { value: 0, label: 'Ore' },
  { value: 1, label: 'Plant' },
  { value: 2, label: 'Basic resource' },
  { value: 3, label: 'Cubatom-splittable' },
  { value: 4, label: 'Manufactory' },
  { value: 5, label: 'Advanced' },
  { value: 6, label: 'Capsule' },
];

export const FACTORY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Capsule refinery' },
  { value: 2, label: 'Micro assembler' },
  { value: 3, label: 'Component factory' },
  { value: 4, label: 'Block assembler' },
  { value: 5, label: 'Chemical factory' },
];

export const RESOURCE_INJECTION_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Ore / terrain resource' },
  { value: 2, label: 'Flora resource' },
];

export const LOD_ACTIVATION_ANIMATION_OPTIONS = [
  { value: 0, label: 'No active LOD switch' },
  { value: 1, label: 'Use active LOD shape while active' },
];

export const EXTRA_PROPERTY_GROUPS = [
  { title: 'Resources / Recipes', keys: ['Consistence', 'CubatomConsistence', 'InRecipe', 'RecipeBuyResource', 'BlockResourceType'] },
  { title: 'Factory / Production', keys: ['ProducedInFactory', 'BasicResourceFactory', 'FactoryBakeTime', 'Factory'] },
  { title: 'Chambers', keys: ['GeneralChamber', 'ChamberCapacity', 'ChamberRoot', 'ChamberParent', 'ChamberUpgradesTo', 'ChamberPermission', 'ChamberAppliesTo', 'ChamberPrerequisites', 'ChamberMutuallyExclusive', 'ChamberChildren', 'ChamberConfigGroups'] },
  { title: 'Controllers', keys: ['ControlledBy', 'Controlling', 'MainCombinationController', 'SupportCombinationController', 'EffectCombinationController'] },
  { title: 'Collision / Physical', keys: ['Physical', 'CollisionDefault', 'CubeCubeCollision', 'UseDetailedCollisionForAstronautMode', 'DetailedCollisionForAstronautMode', 'LodCollisionPhysical', 'Enterable'] },
  { title: 'LOD / Mesh', keys: ['LodShape', 'LodShapeSwitchStyleActive', 'LodActivationAnimationStyle'] },
  { title: 'Logic / Gameplay', keys: ['SensorInput', 'DrawLogicConnection', 'LogicSignaledByRail', 'LogicBlockButton', 'Beacon', 'ResourceInjection', 'ExplosionAbsorbtion'] },
  { title: 'Reactor / Structure', keys: ['StructureHPContribution', 'SourceReference', 'ReactorHp', 'ReactorGeneralIconIndex', 'LowHpSetting', 'OldHitpoints', 'SystemBlock'] },
  { title: 'Inventory / Metadata', keys: ['InventoryGroup', 'FullName', 'WildcardIds'] },
];

const EXTRA_TOOLTIPS: Record<string, string> = {
  Consistence: 'Crafting/material requirements. StarMade reads Item entries with a count and a block/resource type.',
  CubatomConsistence: 'Special material list used by cubatom/capsule splitting logic. Usually empty for regular blocks.',
  InRecipe: 'Controls whether StarMade includes this block in recipe/production systems.',
  RecipeBuyResource: 'Additional resources consumed by buy/craft recipes.',
  BlockResourceType: 'Economy/resource category used to group ores, plants, basic resources, manufactory outputs, advanced parts and capsules.',
  ProducedInFactory: 'Factory tier/category that can produce this block.',
  BasicResourceFactory: 'Factory/resource block associated with basic-resource production.',
  FactoryBakeTime: 'Production time used by the factory pipeline.',
  Factory: 'Marks a factory slot role, typically input or output.',
  GeneralChamber: 'Marks a reactor chamber as a general/root-capable chamber.',
  ChamberCapacity: 'Capacity contribution for reactor chamber systems.',
  ChamberRoot: 'Root chamber this chamber belongs to.',
  ChamberParent: 'Parent chamber required in the upgrade tree.',
  ChamberUpgradesTo: 'Target chamber unlocked/upgraded from this chamber.',
  ChamberPermission: 'Permission mode used by the chamber system.',
  ChamberAppliesTo: 'Block/chamber targets this chamber can apply to.',
  ChamberPrerequisites: 'Required chambers before this chamber can be used.',
  ChamberMutuallyExclusive: 'Chambers that cannot be combined with this one.',
  ChamberChildren: 'Child chambers in the chamber upgrade tree.',
  ChamberConfigGroups: 'Named chamber configuration groups used by reactor UI/configuration.',
  ControlledBy: 'Controller block types that can control this block.',
  Controlling: 'Block types this controller can control.',
  MainCombinationController: 'Marks this block as the main controller in a controller/support/effect combination.',
  SupportCombinationController: 'Marks this block as a support controller in combination systems.',
  EffectCombinationController: 'Marks this block as an effect controller in combination systems.',
  Physical: 'Whether the block participates as a physical/collidable object.',
  CollisionDefault: 'Default collision shape. Source supports None, a block-style collision shape with slab thickness, or a convex hull mesh.',
  CubeCubeCollision: 'Uses simple cube-vs-cube collision handling.',
  UseDetailedCollisionForAstronautMode: 'Enables detailed collision when the player is in astronaut mode.',
  DetailedCollisionForAstronautMode: 'Optional detailed collision shape used in astronaut mode; often a named convex hull mesh for non-cube blocks.',
  LodCollisionPhysical: 'Physical collision behavior for low-detail LOD meshes.',
  Enterable: 'Whether an entity/player can enter or pass into the block volume.',
  LodShape: 'Low-detail mesh used when LOD rendering is active.',
  LodShapeSwitchStyleActive: 'Controls how the LOD shape switches when active/inactive.',
  LodActivationAnimationStyle: 'LOD activation behavior. Style “Use active LOD shape while active” enables the active LOD shape field in the source editor.',
  SensorInput: 'Allows the block to act as a sensor input in logic systems.',
  DrawLogicConnection: 'Draws visible logic connection lines for this block.',
  LogicSignaledByRail: 'Allows rail state/signals to feed the logic system.',
  LogicBlockButton: 'Treats the block as a logic button/input.',
  Beacon: 'Marks this block as beacon-like for gameplay/UI behavior.',
  ResourceInjection: 'Resource injection mode. Source enum maps Off, Ore/terrain resources, and Flora resources for generated/resource blocks.',
  ExplosionAbsorbtion: 'Explosion absorption factor used by damage calculations.',
  StructureHPContribution: 'Additional structure hit points contributed by this block.',
  SourceReference: 'References another block/system as source for this entry.',
  ReactorHp: 'Reactor hit point contribution/value.',
  ReactorGeneralIconIndex: 'Icon index used by reactor/chamber UI.',
  LowHpSetting: 'Behavior/threshold setting used when structure HP is low.',
  OldHitpoints: 'Legacy hit point value retained for compatibility/migration.',
  SystemBlock: 'Marks the block as part of a ship/station system.',
  InventoryGroup: 'Inventory/build menu grouping.',
  FullName: 'Long display name used by game UI.',
  WildcardIds: 'Alternative block IDs/types accepted as equivalent by some systems.',
};

export function tooltipForExtraProperty(key: string): string {
  return EXTRA_TOOLTIPS[key] ?? `${formatPropertyLabel(key)} from BlockConfig.xml. This field is preserved and saved back for StarMade compatibility.`;
}

export function formatPropertyLabel(key: string): string {
  const cleaned = key.replace(/^@_/, '').replace(/^#/, '');
  return cleaned
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^text$/i, 'Value')
    .replace(/^count$/i, 'Count');
}
