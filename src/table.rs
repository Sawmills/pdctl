use comfy_table::{presets::UTF8_FULL_CONDENSED, ContentArrangement, Table, TableComponent};

pub fn new() -> Table {
    let mut table = Table::new();
    table
        .load_preset(UTF8_FULL_CONDENSED)
        .set_content_arrangement(ContentArrangement::Dynamic)
        .set_style(TableComponent::VerticalLines, '│');
    table
}
