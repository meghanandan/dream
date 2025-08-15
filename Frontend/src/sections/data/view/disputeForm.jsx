import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  Grid,
  InputLabel,
  FormControl,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PropTypes from 'prop-types';
import { endpoints } from 'src/utils/axios';
import postService from 'src/utils/httpService';

const disputeSchema = yup.object().shape({
  orderId: yup.string().required('Order ID is required'),
  disputeReason: yup.string().required('Dispute reason is required'),
  disputeAmount: yup
    .number()
    .typeError('Dispute amount must be a number')
    .positive('Amount must be positive')
    .required('Dispute amount is required'),
});

const DisputeForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
  setFirst,
  firstSelect,
  setDisputeAju,
  disputeAdjustment,
}) => {
        const theme = useTheme();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(disputeSchema),
    defaultValues: {
      orderId: initialData?.orderId || '',
      disputeReason: initialData?.disputeReason || '',
      disputeAmount: initialData?.disputeAmount || '',
    },
  });

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  const isUpdateMode = Boolean(initialData);
  // const [firstSelect, setFirstSelect] = useState('');
  // const [openModel,setOpenModel]=useState(open);
  const [disputeAdjustmentDropDown, setDisputeAjustmentDropDown] = useState([]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
    onClose();
    // setFirstSelect('');
    setDisputeAjustmentDropDown([]);
  };
  const handleBlur = (item) => {
    const payload = {
      search_key: '',
      type: item,
    };
    try {
      postService(endpoints.auth.getDisputeorAdjustmentDropDown, 'POST', payload)
        .then((res) => {
          if (res.data.length > 0) {
            // Fixed typo: 'lengt' -> 'length'
            // Use updatedPages as needed
            setDisputeAjustmentDropDown([...res.data]);
            // SetGetFields([...res.data]);
          } else {
            console.log('No data found.');
          }
        })
        .catch((erro) => {
          console.error('Error while fetching master pages:', erro);
        });

      // setLoading(false);
    } catch (err) {
      console.error('Error while adding cluster:', err.response.data.message);
      // setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isUpdateMode ? 'Update Dispute' : 'Create Dispute'}</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Select Dispute or Adjustment</InputLabel>
            <Select value={firstSelect} onChange={(e) => setFirst(e.target.value)}>
              <MenuItem value={1}>Dispute</MenuItem>
              <MenuItem value={2}>Adjustment</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {firstSelect === 1 ? 'Dispute Template ' : 'Adjustment Template '}
            </InputLabel>
            <Select
              value={disputeAdjustment}
              onFocus={() => handleBlur(firstSelect)}
              onChange={(e) => setDisputeAju(e.target.value)}
            >
              {disputeAdjustmentDropDown.map((option, index) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit(handleFormSubmit)} variant='contained' sx={{
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                        }
                      }}>
          {isUpdateMode ? 'Update' : 'Create'}
        </Button>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

DisputeForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.shape({
    orderId: PropTypes.string,
    disputeReason: PropTypes.string,
    disputeAmount: PropTypes.number,
  }),
};

DisputeForm.defaultProps = {
  initialData: null,
};

export default DisputeForm;
