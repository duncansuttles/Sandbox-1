define(function ()
{
	var UndoManager = {};
	var isInitialized = false;
	return {
		getSingleton: function ()
		{
			if (!isInitialized)
			{
				initialize.call(UndoManager);
				isInitialized = true;
			}
			return UndoManager;
		}
	}

	function findid (node,name)
	{
		if(node.name == name)
		{
			return node.id;
		}else
		{
			for(var i in node.children)
			{
				var name1 = findid(node.children[i],name);
				if(name1) return name1;	
			}
		}
		return null;

	}
	function CreateNodeEvent(parent,name,proto,uri)
	{
		this.proto = JSON.parse(JSON.stringify(proto));
		this.name = name;
		this.parent = parent;
		this.uri = uri;
		this.undo = function()
		{
			
			var id = findid(vwf.getNode('index-vwf'),this.name);
			vwf_view.kernel.deleteNode(id);
		}
		this.redo = function()
		{
			vwf_view.kernel.createChild(this.parent,this.name,this.proto,this.uri);
		}
	}
	function DeleteNodeEvent(id)
	{

		this.id = id;
		this.name = vwf.getNode(id).name;
		this.proto = _DataManager.getCleanNodePrototype(id);
		this.parent = vwf.parent(id);
		this.undo = function()
		{
			vwf_view.kernel.createChild(this.parent,this.name,this.proto);
		}
		this.redo = function()
		{
			vwf_view.kernel.deleteNode(this.id);
		}
	}
	function SetPropertyEvent(id,property,val)
	{
		this.property = property;
		this.val = val;
		this.id = id;
		this.oldval = vwf.getProperty(id,property);
		this.undo = function()
		{
			vwf_view.kernel.setProperty(this.id,this.property,this.oldval);
		}
		this.redo = function()
		{
			vwf_view.kernel.setProperty(this.id,this.property,this.val);	
		}
	}
	function initialize()
	{
		this.stack = [];
		this.head = -1;
		this.undo = function()
		{
			if(this.head == 0) return;
			this.stack[this.head-1].undo();
			this.head--;
		}
		this.redo = function()
		{
			if(this.head == this.stack.length) return;

			this.head++;
			this.stack[this.head-1].redo();
		}
		this.recordDelete = function(id)
		{

			this.stack.splice(this.head-1,this.stack.length - this.head);
			if(this.stack.length > 30) this.stack.shift();
			this.stack.push(new DeleteNodeEvent(id));
			this.head = this.stack.length;
		}
		this.recordCreate = function(parent,name,proto,uri)
		{
			this.stack.splice(this.head-1,this.stack.length - this.head);
			if(this.stack.length > 30) this.stack.shift();
			this.stack.push(new CreateNodeEvent(parent,name,proto,uri));
			this.head = this.stack.length;
		}
		this.recordSetProperty = function(id,prop,val)
		{

			if(this.head)
				this.stack.splice(this.head-1,this.stack.length - (this.head));
			else
				this.stack = [];

			if(this.stack.length > 30) this.stack.shift();
			this.stack.push(new SetPropertyEvent(id,prop,val));
			this.head = this.stack.length;
		}
	}
});