/**
 * This file is part of the MonVoisinFaitDuBio project.
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * @copyright Copyright (c) 2016 Sebastian Castro - 90scastro@gmail.com
 * @license    MIT License
 * @Last Modified time: 2016-12-13
 */
import AppModule from "../app.module";
declare var App : AppModule;
declare var google : any;
import $ = require("jquery");
declare var Twig : any;
declare var twigJs_elementInfo : any;

export class Element 
{	
	readonly id : number;
	readonly name : string;
	readonly position;
	readonly adresse : string;
	readonly description : string;
	readonly tel : string;
	readonly webSite : string;
	readonly mail : string;
	readonly products = [];

	//TODO
	mainProduct : any;
	mainProductIsDisabled : boolean;
	horaires ;
	type;	

	distance : number;

	isInitialized_ :boolean = false;

	isVisible_ : boolean = false;
	isInElementList : boolean= false;

	//TODO
	biopenMarker_ = null;
	htmlRepresentation_ = '';
	formatedHoraire_ = null;

	productsToDisplay_ = [];

	starChoiceForRepresentation = '';
	isShownAlone : boolean= false;

	isFavorite : boolean= false;

	constructor(elementJson)
	{
		this.id = elementJson.id;
		this.name = elementJson.name;
		this.position = new google.maps.LatLng(elementJson.latlng.latitude, elementJson.latlng.longitude);
		this.adresse = elementJson.adresse;
		this.description = elementJson.description;
		this.tel = elementJson.tel ? elementJson.tel.replace(/(.{2})(?!$)/g,"$1 ") : '';	
		this.webSite = elementJson.web_site;
		this.mail = elementJson.mail;

		this.products = [];
		var product;
		if (elementJson.type == 'epicerie') 
		{
			product = [];

			product.name = 'Epicerie';
			product.nameShort = 'Epicerie';
			product.nameFormate = 'epicerie';

			this.products.push(product);
		}
		else
		{
			for (var i = 0; i < elementJson.products.length; i++) 
			{
				product = [];

				product.name = elementJson.products[i].product.name;
				product.nameShort = elementJson.products[i].product.name_short;
				product.nameFormate = elementJson.products[i].product.name_formate;
				product.descriptif = elementJson.products[i].descriptif;
				product.disabled = false;

				this.products.push(product);
			}
		}

		this.mainProduct = elementJson.main_product;
		this.mainProductIsDisabled = false;
		this.horaires = elementJson.horaires;
		this.type = elementJson.type;	

		this.distance = elementJson.distance ? Math.round(elementJson.distance) : null;
	}

initialize() 
{		
	if (!this.isInitialized_) 
	{
		this.biopenMarker_ = new BiopenMarker(this.id, this.position);
		this.isInitialized_ = true;
	}		
}

show() 
{		
	if (!this.isInitialized_) this.initialize();	
	this.biopenMarker_.updateIcon();
	this.biopenMarker_.show();
	this.isVisible_ = true;		
};

hide() 
{		
	this.biopenMarker_.hide();
	this.isVisible_ = false;
	// unbound events (click etc...)?
	//if (constellationMode) $('#ElementList #element-info-'+this.id).hide();
};

// updateProductsRepresentation() 
// {		
// 	if (!App.constellationMode()) return;

// 	var starNames = App.constellation.getStarNamesRepresentedByElementId(this.id);
// 	if (this.isProducteurOrAmap())
// 	{
// 		for(let i = 0; i < this.products.length;i++)
// 		{
// 			productName = this.products[i].nameFormate;			

// 			if ($.inArray(productName, starNames) == -1)
// 			{
// 				this.products[i].disabled = true;				
// 				if (productName == this.mainProduct) this.mainProductIsDisabled = true;				
// 			}	
// 			else
// 			{
// 				this.products[i].disabled = false;				
// 				if (productName == this.mainProduct) this.mainProductIsDisabled = false;		
// 			}		
// 		}
// 	}
// 	else
// 	{
// 		if (starNames.length === 0) this.mainProductIsDisabled = true;	
// 		else this.mainProductIsDisabled = false;	
// 	}
// };

getHtmlRepresentation() 
{	
	//var starNames = App.constellationMode ? App.constellation.getStarNamesRepresentedByElementId(this.id) : [];
	let startNames = [];
	var location = App.map.location;
	if (location)
	{
		this.distance = calculateDistanceFromLatLonInKm(location, this.position);
		// distance vol d'oiseau, on arrondi et on l'augmente un peu
		this.distance = Math.round(1.2*this.distance);
	}


	var html = Twig.render(twigJs_elementInfo, 
				{
					element : this, 
					horaires : this.getFormatedHoraires(), 
					constellationMode: constellationMode, 
					productsToDisplay: this.getProductsNameToDisplay(), 
					starNames : starNames 
				});
	this.htmlRepresentation_ = html;				
	return html;
};

getProductsNameToDisplay()
{
	this.updateProductsRepresentation();

	this.productsToDisplay_.main = [];
	this.productsToDisplay_.others = [];
	var productName;

	if (!this.mainProductIsDisabled || !this.isProducteurOrAmap())
	{
		this.productsToDisplay_.main.value = this.mainProduct;				
		this.productsToDisplay_.main.disabled = this.mainProductIsDisabled;		
	}		

	var productIsDisabled;
	for(var i = 0; i < this.products.length;i++)
	{
		productName = this.products[i].nameFormate;
		productIsDisabled = this.products[i].disabled;
		if (productName != this.productsToDisplay_.main.value)
		{
			// si le main product est disabled, on choppe le premier produit
			// non disable et on le met en produit principal
			if (!productIsDisabled && !this.productsToDisplay_.main.value)
			{
				this.productsToDisplay_.main.value = productName;				
				this.productsToDisplay_.main.disabled = productIsDisabled;				
			}
			else
			{
				this.pushToProductToDisplay(productName, productIsDisabled);
			}				
		}			
	}

	// si on a tjrs pas de mainProduct (ils sont tous disabled)
	if (!this.productsToDisplay_.main.value)	
	{
		this.productsToDisplay_.main.value = this.mainProduct;				
		this.productsToDisplay_.main.disabled = this.mainProductIsDisabled;

		this.productsToDisplay_.others.splice(0,1);
	}	

	this.productsToDisplay_.others.sort(this.compareProductsDisabled);	

	return this.productsToDisplay_;
};

private compareProductsDisabled(a,b) 
{  
  if (a.disabled == b.disabled) return 0;
  return a.disabled ? 1 : -1;
}



pushToProductToDisplay(productName, disabled)
{
	var new_product = [];
	new_product.value = productName;
	new_product.disabled = disabled;
	this.productsToDisplay_.others.push(new_product);
};

getFormatedHoraires() 
{		
	if (this.formatedHoraire_ === null )
	{		
		this.formatedHoraire_ = {};
		var new_key;
		for(var key in this.horaires)
		{
			new_key = key.split('_')[1];
			this.formatedHoraire_[new_key] = this.formateJourHoraire(this.horaires[key]);
		}
	}
	return this.formatedHoraire_;
};

formateJourHoraire(dayHoraire) 
{		
	if (dayHoraire === null)
	{		
		return 'fermé';
	}
	var result = '';
	if (dayHoraire.plage1debut)
	{
		result+= this.formateDate(dayHoraire.plage1debut);
		result+= ' - ';
		result+= this.formateDate(dayHoraire.plage1fin);
	}
	if (dayHoraire.plage2debut)
	{
		result+= ' et ';
		result+= this.formateDate(dayHoraire.plage2debut);
		result+= ' - ';
		result+= this.formateDate(dayHoraire.plage2fin);
	}
	return result;
};

formateDate(date) 
{		
	if (!date) return;
	return date.split('T')[1].split(':00+0100')[0];
};

isProducteurOrAmap() 
{		
	return ($.inArray( this.type, [ "producteur", "amap" ] ) > -1);
};

isCurrentStarChoiceRepresentant() 
{		
	if ( this.starChoiceForRepresentation !== '')
	{
		var elementStarId = App.constellation.getStarFromName(this.starChoiceForRepresentation).getElementId();
		return (this.id == elementStarId);
	}
	return false;	
};









// --------------------------------------------
//            SETTERS GETTERS
// ---------------------------------------------
get marker() 
{		
	// initialize = initialize || false;
	// if (initialize) this.initialize();
	return this.biopenMarker_;
};

get isVisible() 
{		
	return this.isVisible_;
};

get isInitialized() 
{		
	return this.isInitialized_;
};


}
