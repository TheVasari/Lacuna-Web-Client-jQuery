// This defines a 'building type', e.g. SpacePort but in the generic sense
// i.e. it does not describe a specific instance of a building (e.g. the building at location x,y on planet q)
// It defines methods to display information about a type of building
//
define(['jquery', 'lacuna', 'mapPlanet', 'library', 'template', 'body'], function($, Lacuna, MapPlanet, Library, Template, Body) {

    Template.load('building');

    // I don't like this, I prefer to detect if the file exists and if so load it
    // if not load the default. But I have not found a neat way to do this (yet)
    // an alternative is to put this info into resources.json?
    var moduleTypes = {
        planetarycommand    :   'planetaryCommand',
    };

    function BuildingType() {
        var scope = this;
        var modules = new Array();

        // View the building Dialog
        this.view = function(building) {

            Lacuna.send({
                module: building.url,
                method: 'view',
                params: [
                    Lacuna.getSession(),
                    building.id
                ],

                success: function(o) {
                    var tabs = [{
                        name    : 'View',
                        content : scope.getViewTab(o.result.building)
                    }];

                    // Remove the leading slash.
                    building.type = building.url.replace('/', '');
                    if (modules[building.type]) {
                        // Use the cached value
                        scope.createTabs(tabs, o.result.building, modules[building.type]);
                    }
                    else {
                        var loadBuildingType = moduleTypes[building.type];
                        if ( ! loadBuildingType ) {
                            loadBuildingType = 'defaultBuilding';
                        }
                        require(['building/'+loadBuildingType], function(LoadedBuildingType) {
                            // We only have to load it once, then we can use the cached value
                            LoadedBuildingType.url = building.url;
                            modules[building.type] = LoadedBuildingType;
                            scope.createTabs(tabs, o.result.building, LoadedBuildingType);
                        });
                    }
                }
            });
        };

        // Add any building specific tabs, output the building Dialog box
        //
        this.createTabs = function(tabs, building, LoadedBuildingType) {
            var extraTabs = LoadedBuildingType.getTabs();

            // Put 'em together.
            if (extraTabs) {
                tabs = tabs.concat(extraTabs);
            }

            var panel = Lacuna.Panel.newTabbedPanel({
                draggable       : true,
                name            : building.type + ' ' + building.level,
                preTabContent   : scope.getBuildingHeader(building, LoadedBuildingType),
                tabs            : tabs
            });

            // Now that everything is on the screen, add in all the events.
            if (building.downgrade.can) {
                $('#downgradeButton_' + building.id).on(
                    'click', {
                        building    : building,
                        url         : LoadedBuildingType.url,
                        panel       : panel
                    },
                this.downgrade
                );
            }
            if (building.upgrade.can) {
                $('#upgradeButton_' + building.id).on(
                    'click', {
                        building    : building,
                        url         : LoadedBuildingType.url,
                        panel       : panel
                    },
                    this.upgrade
                );
            }

            $('#demolishButton_' + building.id).on(
                'click', {
                    building    : building,
                    url         : LoadedBuildingType.url,
                    panel       : panel
                },
                this.demolish
            );
        };

        this.getBuildingHeader = function(building, BuildingType) {
            return Template.read.building_header({
                background_image    : $('#lacuna').css('background-image'),
                assets_url          : window.assetsUrl,
                building_image      : building.image,
                building_desc       : Lacuna.getBuildingDesc(BuildingType.url)
            });
        };

        this.getViewTab = function(o) {
            var currentProduction = Template.read.building_current_production({
                assets_url      : window.assetsUrl,
                food_hour       : Library.formatNum(o.food_hour),
                ore_hour        : Library.formatNum(o.ore_hour),
                water_hour      : Library.formatNum(o.water_hour),
                energy_hour     : Library.formatNum(o.energy_hour),
                waste_hour      : Library.formatNum(o.waste_hour),
                happiness_hour  : Library.formatNum(o.happiness_hour),
                building_id     : o.id
            });
            var upgradeProduction = Template.read.building_upgrade_production({
                assets_url: window.assetsUrl,
                up_food_hour: Library.formatNum(o.upgrade.production.food_hour),
                up_ore_hour: Library.formatNum(o.upgrade.production.ore_hour),
                up_water_hour: Library.formatNum(o.upgrade.production.water_hour),
                up_energy_hour: Library.formatNum(o.upgrade.production.energy_hour),
                up_waste_hour: Library.formatNum(o.upgrade.production.waste_hour),
                up_happy_hour: Library.formatNum(o.upgrade.production.happiness_hour),
                up_food_bad: parseInt(o.upgrade.production.food_hour) > parseInt(Body.get.food_hour),
                up_ore_bad: parseInt(o.upgrade.production.ore_hour) > parseInt(Body.get.ore_hour),
                up_water_bad: parseInt(o.upgrade.production.water_hour) > parseInt(Body.get.water_hour),
                up_energy_bad: parseInt(o.upgrade.production.energy_hour) > parseInt(Body.get.energy_hour),
                up_happy_bad: parseInt(o.upgrade.production.happiness_hour) > parseInt(Body.get.happiness_hour),
                building_id: o.id,
                to_level: parseInt(o.level) - 1,
                downgrade_reason: o.downgrade.reason[1],
                can_downgrade: o.downgrade.can
            });
            var upgradeCost = Template.read.building_upgrade_cost({
                assets_url: window.assetsUrl,
                up_food_cost: Library.formatNum(o.upgrade.cost.food || 0),
                up_ore_cost: Library.formatNum(o.upgrade.cost.ore || 0),
                up_water_cost: Library.formatNum(o.upgrade.cost.water || 0),
                up_energy_cost: Library.formatNum(o.upgrade.cost.energy || 0),
                up_waste_cost: Library.formatNum(o.upgrade.cost.waste || 0),
                up_time_cost: Library.formatNum(o.upgrade.cost.time || 15),
                up_food_bad: parseInt(o.upgrade.cost.food) > parseInt(Body.get.food_storage),
                up_ore_bad: parseInt(o.upgrade.cost.ore) > parseInt(Body.get.ore_storage),
                up_water_bad: parseInt(o.upgrade.cost.water) > parseInt(Body.get.water_storage),
                up_energy_bad: parseInt(o.upgrade.cost.energy) > parseInt(Body.get.energy_storage),
                up_waste_bad: parseInt(o.upgrade.cost.waste) > parseInt(Body.get.waste_storage),
                building_id: o.id,
                to_level: parseInt(o.level) + 1,
                upgrade_reason: o.upgrade.reason[1],
                can_upgrade: o.upgrade.can
            });

            return [
                currentProduction,
                upgradeProduction,
                upgradeCost
            ].join('');
        };

        this.upgrade = function(e) {

            // TODO: As per the current Web Client there is a popup
            // which warns users about accidentally upgrading a
            // building and using Halls. I do not like this
            // approach to the situation. Need to find a better way
            // to show the warning but not bother the more experienced
            // players with extra clicking.

            Lacuna.send({
                module: e.data.url,
                method: 'upgrade',

                params: [
                    Lacuna.getSession(),
                    e.data.building.id
                ],
                
                success: function(o) {
                    // Close the panel.
                    e.data.panel.close(function() {
                        // nothing to do, building updates take care of themselves now    
                    });
                }
            });
        };

        this.downgrade = function(e) {
            Lacuna.confirm('Are you sure you want to downgrade your ' + e.data.building.name +
                ' to level ' + (parseInt(e.data.building.level) - 1) + '?',
            undefined, function(response) {
                // Once the user has confirmed that they actually
                // want to downgrade the building, do it!
                if (response) {
                    Lacuna.send({
                        module: e.data.url,
                        method: 'downgrade',
                        params: [
                            Lacuna.getSession(),
                            e.data.building.id
                        ],
                        
                        success: function(o) {
                            // Close the panel.
                            e.data.panel.close(function() {
                                // nothing to do, building updates take care of themselves now
                            });
                        }
                    });
                }
            });
        };

        this.demolish = function(e) {
            Lacuna.confirm(
                'Are you sure you want to demolish your ' + e.data.building.name + '?',
            undefined, function(response) {
                if (response) {
                    Lacuna.send({
                        module: e.data.url,
                        method: 'demolish',
                        
                        params: [
                            Lacuna.getSession(),
                            e.data.building.id
                        ],
                        
                        success: function(o) {
                            // Close the panel.
                            e.data.panel.close(function() {
                                // nothing to do, building updates take care of themselves now
                            });
                        }
                    });
                }
            });
        };
    }
    
    return new BuildingType();
});
