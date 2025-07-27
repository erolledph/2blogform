import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { settingsService } from '@/services/settingsService';
import DataTable from '@/components/shared/DataTable';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Modal from '@/components/shared/Modal';
import { Edit, Trash2, Plus, ImageIcon, DollarSign, Package, ExternalLink, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusBadgeClass } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ManageProductsPage({ activeBlogId }) {
  const { products, loading, error, refetch } = useProducts(activeBlogId);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null });
  const [userCurrency, setUserCurrency] = useState('$');
  const { getAuthToken, currentUser } = useAuth();

  useEffect(() => {
    fetchUserSettings();
  }, [currentUser]);

  const fetchUserSettings = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const settings = await settingsService.getUserSettings(currentUser.uid);
      setUserCurrency(settings.currency || '$');
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Keep default currency on error
    }
  };

  const handleDelete = async (product) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/.netlify/functions/admin-product`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: product.id, blogId: activeBlogId })
      });

      if (response.ok) {
        toast.success('Product deleted successfully');
        refetch(); // Refresh the list
        setDeleteModal({ isOpen: false, product: null });
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const calculateDiscountedPrice = (price, percentOff) => {
    if (!price || !percentOff || percentOff <= 0) return price;
    return price - (price * (percentOff / 100));
  };

  const columns = [
    {
      key: 'image',
      title: 'Image',
      sortable: false,
      render: (value, row) => (
        <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
          <div className="relative">
          {((row.imageUrls && row.imageUrls.length > 0) || row.imageUrl) ? (
            <img
              src={(row.imageUrls && row.imageUrls.length > 0) ? row.imageUrls[0] : row.imageUrl}
              alt={row.name}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-border"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-md border border-border flex items-center justify-center ${((row.imageUrls && row.imageUrls.length > 0) || row.imageUrl) ? 'hidden' : 'flex'}`}
          >
            <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          {/* Image count indicator for multiple images */}
          {row.imageUrls && row.imageUrls.length > 1 && (
            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {row.imageUrls.length}
            </div>
          )}
        </div>
        </div>
      )
    },
    {
      key: 'name',
      title: 'Product',
      render: (value, row) => (
        <div className="flex flex-col min-w-0">
          <div className="text-sm sm:text-base font-medium text-foreground truncate mb-1">
            {value}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            /{row.slug}
          </div>
          {row.category && (
            <div className="text-xs text-muted-foreground mt-1">
              {row.category}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'price',
      title: 'Price',
      render: (value, row) => {
        const originalPrice = parseFloat(value) || 0;
        const percentOff = parseFloat(row.percentOff) || 0;
        const discountedPrice = calculateDiscountedPrice(originalPrice, percentOff);
        
        return (
          <div className="text-center">
            {percentOff > 0 ? (
              <div className="space-y-1">
                <div className="text-sm line-through text-muted-foreground">
                  {userCurrency}{originalPrice.toFixed(2)}
                </div>
                <div className="text-sm font-bold text-primary">
                  {userCurrency}{discountedPrice.toFixed(2)}
                </div>
                <div className="text-xs text-red-600">
                  {percentOff}% off
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-foreground">
                {userCurrency}{originalPrice.toFixed(2)}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <span className={`badge ${getStatusBadgeClass(value)} text-xs sm:text-sm`}>
          {value}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value) => (
        <span className="text-sm sm:text-base text-foreground">
          {value ? format(value.toDate(), 'MMM dd, yyyy') : 'N/A'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center space-x-1">
          <a
            href={`/preview/product/${currentUser?.uid}/${activeBlogId}/${row.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 p-2 rounded-md hover:bg-green-50 transition-colors duration-200"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </a>
          {row.productUrl && (
            <a
              href={row.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors duration-200"
              title="View Product"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <Link
            to={`/dashboard/edit-product/${row.id}`}
            className="text-primary p-2 rounded-md hover:bg-primary/10 transition-colors duration-200"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDeleteModal({ isOpen: true, product: row })}
            className="text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors duration-200"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading products: {error}</p>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title mb-2">Manage Products</h1>
        </div>
        <Link
          to="/dashboard/create-product"
          className="btn-primary inline-flex items-center"
        >
          <Plus className="h-5 w-5 mr-3" />
          Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card">
          <div className="card-content text-center py-16">
            <Package className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-2xl font-semibold text-foreground mb-4">No products found</h3>
            <p className="text-lg text-muted-foreground mb-8">
              Get started by adding your first product to the catalog.
            </p>
            <Link to="/dashboard/create-product" className="btn-primary">
              <Plus className="h-5 w-5 mr-3" />
              Add Your First Product
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-content p-0">
            <DataTable
              data={products}
              columns={columns}
              searchable={true}
              sortable={true}
              pagination={true}
              pageSize={10}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, product: null })}
        title="Delete Product"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-base text-foreground">
            Are you sure you want to delete "{deleteModal.product?.name}"?
          </p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={() => setDeleteModal({ isOpen: false, product: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.product)}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}