class ApiFeatures {
	constructor(query, queryString) {
	  this.query = query;
	  this.queryString = queryString;
	}
  
	//  the property
	filter() {
	  // Filtering
	  const queryObj = { ...this.queryString };
	  const excludedFields = ['page', 'sort', 'limit', 'fields', 'select'];
	  excludedFields.forEach((el) => delete queryObj[el]);
	  // Advance Filtering
	  let queryStr = JSON.stringify(queryObj);
  
	  queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);
  
	  this.query = this.query.find(JSON.parse(queryStr));
	  return this;
	}
  
	select() {
	  //selecting by properties
	  if (this.queryString.select) {
		const fields = this.queryString.select.split(',').join(' ');
		this.query = this.query.select(fields);
	  } else {
		this.query = this.query.select('-__v'); // excluding this field
	  }
	  return this;
	}
  
	sort() {
	  if (this.queryString.sort) {
		const sortBy = this.queryString.sort.split(',').join(' ');
		this.query = this.query.sort(sortBy);
	  }
	  // else {
	  //   this.query = this.query.sort('-createdAt');
	  // } this code is creating a unexpected behaviour where when we try to go to another page
	  // the data is same as the previous page while limit is 1
	  return this;
	}
  
	limitFields() {
	  // limitFields and select are both same method/function used to select fields
	  if (this.queryString.fields) {
		const fields = this.queryString.fields.split(',').join(' ');
		this.query = this.query.select(fields);
	  } else {
		this.query = this.query.select('__v');
	  }
	  return this;
	}
  
	paginate() {
	  const page = this.queryString.page * 1 || 1;
	  const limit = this.queryString.limit * 1 || 10;
	  const skip = (page - 1) * limit;
  
	  this.query = this.query.skip(skip).limit(limit);
	  // if (this.queryString.page) {
	  //   const numTours = await Tour.countDocuments();
	  //   if(skip>=numTours) throw new Error('This page does not exist')
	  // }
	  return this;
	}
}
  
module.exports = ApiFeatures