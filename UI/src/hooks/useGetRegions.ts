// Re-export types so existing imports don't break
export type { GeneratorItemModel, RegionGroupModel, RegionModel } from '../context/RegionsContext';

// useRegions now reads from the shared RegionsContext instead of fetching its own copy.
// All consumers (Sidebar, SettingsView, GeneratorGroupView, GroupManagementView) share one
// fetch and one refetch, so adding a region/group/generator anywhere updates everywhere.
export { useRegionsContext as useRegions } from '../context/RegionsContext';
